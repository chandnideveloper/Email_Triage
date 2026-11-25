from celery_app import celery_app


@celery_app.task
def test_email_processing(email_id: str):
    print(f"Processing email: {email_id}")
    return {
        "email_id": email_id,
        "status": "processed",
        "message": "Email processed successfully",
    }
