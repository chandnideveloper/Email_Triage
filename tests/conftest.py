import pytest

SAMPLE_ENGAGEMENT = """Harbourview Plumbing Pty Ltd reports GST on a cash basis and lodges BAS quarterly. It is a plumbing business in Wyong run by two directors.

Engagement instructions: prepare the quarterly BAS from the Xero ledger export. The service deadline is 28 days after quarter end.

The ABN is 51 824 753 556 and the director's TFN is 123 456 782. Contact Mr John Citizen on 0412 345 678 or john@harbourview.example.

Prior year review notes: the previous period had a late fuel tax credit adjustment and a reconciliation variance on the vehicle loan.

Current period status: bank reconciliation is complete to 30 September; the supplier invoices for September are outstanding.

Risk: watch for private use of the work ute, which was an issue last year."""


@pytest.fixture(autouse=True)
def _fresh_model_client(request):
    if "readiness" not in request.node.nodeid and "privacy_box" not in request.node.nodeid:
        yield None
        return
    try:
        settings = request.getfixturevalue("settings")
    except Exception:
        yield None
        return
    from readiness.gateway.clients import InProcessPrivacyClient, set_model_client

    client = InProcessPrivacyClient()
    set_model_client(client)
    yield client
    set_model_client(None)


@pytest.fixture
def model_client(_fresh_model_client):
    return _fresh_model_client


@pytest.fixture
def users(db, django_user_model):
    make = lambda name: django_user_model.objects.create_user(username=name, password="x")  # noqa: E731
    return {n: make(n) for n in ("partner", "manager", "staff", "staff2", "admin", "outsider")}


@pytest.fixture
def firm(db, users):
    from readiness.firms.models import Firm, FirmMembership, Role

    f = Firm.objects.create(name="Demo Firm", slug="demo", is_synthetic=True,
                            allowed_models=["dev-small", "dev-mid", "dev-large"])
    roles = {"partner": Role.PARTNER, "manager": Role.MANAGER, "staff": Role.STAFF,
             "staff2": Role.STAFF, "admin": Role.ADMIN}
    for name, role in roles.items():
        FirmMembership.objects.create(firm=f, user=users[name], role=role)
    return f


@pytest.fixture
def other_firm(db, users):
    from readiness.firms.models import Firm

    return Firm.objects.create(name="Other Firm", slug="other", is_synthetic=True, allowed_models=["dev-mid"])


@pytest.fixture
def job(firm, users):
    from readiness.contexts.models import Client, Job, JobAssignment, KnownEntity

    client = Client.objects.create(firm=firm, name="Harbourview Plumbing Pty Ltd", risk_rating="medium")
    KnownEntity.objects.create(firm=firm, client_ref=str(client.id), value="John Citizen", label="PERSON")
    j = Job.objects.create(firm=firm, client=client, service_type="BAS", period_label="Q1 FY2027")
    JobAssignment.objects.create(job=j, user=users["staff"])
    return j


@pytest.fixture
def evidence(firm, job, users):
    from readiness.documents.extraction import extract_version
    from readiness.documents.services import add_version, create_document

    doc = create_document(firm, users["manager"], str(job.id), "Engagement notes", category="engagement")
    v = add_version(doc, users["manager"], "engagement.txt", SAMPLE_ENGAGEMENT.encode())
    extract_version(v)
    return v


@pytest.fixture
def draft(firm, job, users, evidence):
    from readiness.briefings.services import request_package
    from readiness.knowledge.services import raise_issue

    raise_issue(firm, users["manager"], str(job.id), "September supplier invoices not yet received", "high")
    return request_package(firm, users["manager"], str(job.id))


@pytest.fixture
def published(draft, users):
    from readiness.briefings.services import approve, submit_for_review

    submit_for_review(draft, users["manager"])
    return approve(draft, users["partner"], acknowledge_gaps=True)


@pytest.fixture(autouse=True)
def isolated_repo(request: pytest.FixtureRequest, tmp_path, monkeypatch):
    """Provides an isolated in-memory/temp-file EmailRepository for each test."""
    if "readiness" in request.node.nodeid or "privacy_box" in request.node.nodeid:
        yield None
        return

    from email_triage.config import TriageConfig
    from email_triage.storage.email_repository import EmailRepository

    store_file = tmp_path / "test_store.json"
    att_dir = tmp_path / "attachments"
    monkeypatch.setenv("REPOSITORY_STORAGE_PATH", str(store_file))
    monkeypatch.setenv("ATTACHMENT_STORAGE_DIR", str(att_dir))
    monkeypatch.setenv("TASK_ALWAYS_EAGER", "True")
    monkeypatch.setenv("GRAPH_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("GRAPH_CLIENT_SECRET", "test-client-secret")
    monkeypatch.setenv("GRAPH_TENANT_ID", "test-tenant-id")
    monkeypatch.setenv("TARGET_MAILBOX", "triage-test@example.com")
    monkeypatch.setenv("WEBHOOK_CLIENT_STATE", "test-secret-state")

    cfg = TriageConfig(
        client_id="test-client-id",
        client_secret="test-client-secret",
        tenant_id="test-tenant-id",
        target_mailbox="triage-test@example.com",
        repository_storage_path=store_file,
        attachment_storage_dir=att_dir,
        task_always_eager=True,
        webhook_client_state="test-secret-state",
    )
    repo = EmailRepository(config=cfg, persist_to_disk=False)
    repo.clear()
    yield repo


@pytest.fixture
def mock_auth_transport():
    """Mocks Microsoft Entra OAuth2 token endpoint response."""
    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        if "oauth2/v2.0/token" in str(request.url):
            return httpx.Response(
                200,
                json={
                    "token_type": "Bearer",
                    "expires_in": 3599,
                    "access_token": "mock-test-access-token-xyz123",
                },
            )
        return httpx.Response(404)

    return httpx.MockTransport(handler)
