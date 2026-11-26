import { EmailRecord } from '@/types';

export const INITIAL_MOCK_EMAILS: EmailRecord[] = [
  {
    "internal_id": "c2e35f0756cb4a6cbe5a428811006a43",
    "graph_message_id": "AAMkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgBGAAAAAABav9etF8t-SKPKIR1vHjnQBwB85UnBCohpQqam-W0465BRAAAAAAEMAAB85UnBCohpQqam-W0465BRAAAAfNUWAAA=",
    "internet_message_id": "<CAFjUDf76XAYygmDZryrzKBye5U2L9aZ4W4y=90JzXj9HJ=VAEg@mail.gmail.com>",
    "conversation_id": "AAQkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgAQADtTtSxDUjFJiNUNgonx8Ak=",
    "sender_name": "Chandni Poddar",
    "sender_email": "poddarchandni5@gmail.com",
    "recipients": [
      {
        "name": "IBEX Mailbox Triage",
        "email": "ibex.triage@aoscaustralia.com"
      }
    ],
    "cc": [],
    "bcc": [],
    "subject": "Doc",
    "body_plain": "Hi Accounts Team,\nI am following up regarding invoice INV-2026-1042 for AUD 4,850.00, which was issued on 10 November 2026.\nThe payment is due today, 24 November 2026. Could you please confirm whether the payment has been processed?\nIf payment has already been made, kindly share the transaction reference.\nPlease treat this as urgent, as we need to close our accounts for this month.\nRegards,\nJames Wilson\nFinance Manager\nWilson & Associates\nPhone: +61 412 345 678",
    "body_html": "<html><head>\r\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"></head><body><div dir=\"ltr\"><p></p><p>Hi Accounts Team,</p><p>I am following up regarding invoice INV-2026-1042 for AUD 4,850.00, which was issued on 10 November 2026.</p><p>The payment is due today, 24 November 2026. Could you please confirm whether the payment has been processed?</p><p>If payment has already been made, kindly share the transaction reference.</p><p>Please treat this as urgent, as we need to close our accounts for this month.</p><p>Regards,</p><p>James Wilson<br>Finance Manager<br>Wilson &amp; Associates<br>Phone: +61 412 345 678</p></div></body></html>",
    "received_at": "2026-11-25T02:44:06Z",
    "is_read": false,
    "has_attachments": true,
    "attachments": [
      {
        "id": "120396ec70dd4f59b87e8d64f8e730ec",
        "graph_attachment_id": "AAMkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgBGAAAAAABav9etF8t-SKPKIR1vHjnQBwB85UnBCohpQqam-W0465BRAAAAAAEMAAB85UnBCohpQqam-W0465BRAAAAfNUWAAABEgAQAH150AWbWXtIi7ZWLtPyrbs=",
        "email_internal_id": "c2e35f0756cb4a6cbe5a428811006a43",
        "filename": "Ibex_Mailbox_Triage_Technical_Specification_v0.1.pdf",
        "content_type": "application/pdf",
        "size_bytes": 1218,
        "sha256": "0740a2601902a8ace2aae75b6c73f4ceded27fae1347da34ffb58637eced5820",
        "is_inline": false,
        "storage_path": "C:\\Users\\ayush\\OneDrive\\Desktop\\IBEX_core\\Email_Triage\\storage_data\\attachments\\07\\0740a2601902a8ace2aae75b6c73f4ceded27fae1347da34ffb58637eced5820.pdf",
        "downloaded_at": "",
        "ibex_compatible_payload": {
          "schema_version": "1.0",
          "document_id": "DOC-UNTITLED",
          "message_id": "MSG-UNTITLED",
          "client": {
            "client_id": null,
            "entity_id": null,
            "group_id": null,
            "client_name": null,
            "confidence": 0.0,
            "match_basis": "unmatched",
            "matched_value": null
          },
          "classification": {
            "document_type": "signed_return",
            "subtype": null,
            "confidence": 0.4,
            "top_predictions": [
              {
                "document_type": "signed_return",
                "subtype": null,
                "confidence": 0.4
              },
              {
                "document_type": "ato_notice",
                "subtype": null,
                "confidence": 0.08
              },
              {
                "document_type": "platform_statement",
                "subtype": null,
                "confidence": 0.07
              }
            ]
          },
          "intent": {
            "type": "no_action",
            "confidence": 0.0
          },
          "extracted_fields": {
            "supplier_name": "Hi Accounts Team,",
            "abn": "61 412 345 678",
            "reference": "INV-2026-1042",
            "document_date": "10 November 2026",
            "period_start": null,
            "period_end": null,
            "financial_year": "FY2027",
            "amount_total": null,
            "gst": null
          },
          "sensitivity": "normal",
          "sensitivity_reasons": [],
          "duplicate_of": null,
          "suggested_job_ref": null,
          "job_conf": 0.0,
          "status": "needs_review",
          "review_reasons": [
            "Client confidence (0.00) below threshold (0.95)",
            "Document type confidence (0.40) below threshold (0.85)"
          ]
        }
      }
    ],
    "triage": {
      "category": "Urgent",
      "priority": "Critical",
      "confidence": 0.4,
      "action_required": true,
      "response_required": true,
      "follow_up_required": false,
      "suggested_action": "Review immediately and respond to sender.",
      "due_date": null,
      "summary": "Email from Chandni Poddar regarding 'Doc'. Hi Accounts Team,\nI am following up regarding invoice INV-2026-1042 for AUD 4,850.00, which was issued on 10 November 2026.",
      "key_points": [
        "Includes attachment(s): Ibex_Mailbox_Triage_Technical_Specification_v0.1.pdf",
        "The payment is due today, 24 November 2026.",
        "Could you please confirm whether the payment has been processed?",
        "If payment has already been made, kindly share the transaction reference."
      ],
      "entities": {
        "ai_classification": {
          "document_type": "signed_return",
          "platform_subtype": null,
          "confidence": 0.4,
          "status": "needs_review",
          "client": {
            "client_id": null,
            "entity_id": null,
            "group_id": null,
            "client_name": null,
            "confidence": 0.0,
            "match_basis": "unmatched",
            "matched_value": null
          },
          "extracted_fields": {
            "supplier_name": "Hi Accounts Team,",
            "abn": "61 412 345 678",
            "reference": "INV-2026-1042",
            "document_date": "10 November 2026",
            "period_start": null,
            "period_end": null,
            "financial_year": "FY2027",
            "amount_total": null,
            "gst": null
          },
          "sensitivity": "normal",
          "suggested_job_ref": null,
          "review_reasons": [
            "Client confidence (0.00) below threshold (0.95)",
            "Document type confidence (0.40) below threshold (0.85)"
          ]
        },
        "amounts": [
          "$4,850.00"
        ],
        "sender_name": "Chandni Poddar"
      },
      "triaged_at": "2026-11-25T02:44:20.762773+00:00"
    },
    "processing_status": "TRIAGED",
    "error_message": "",
    "retry_count": 0,
    "created_at": "2026-11-25T02:44:15.438146+00:00",
    "updated_at": "2026-11-25T02:44:15.438149+00:00"
  },
  {
    "internal_id": "def918aa8d5640abaad707534c6e199e",
    "graph_message_id": "AAMkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgBGAAAAAABav9etF8t-SKPKIR1vHjnQBwB85UnBCohpQqam-W0465BRAAAAAAEMAAB85UnBCohpQqam-W0465BRAAAAfNUVAAA=",
    "internet_message_id": "<CAFXFHpOBopq4oALVhQ6fk3TKVsruF_SWqkiBqT6Qr_vELVd1nw@mail.gmail.com>",
    "conversation_id": "AAQkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgAQADdfIYLgIqhNjTLfO8AYApA=",
    "sender_name": "Ayushi Singh",
    "sender_email": "ayushiisingh08@gmail.com",
    "recipients": [
      {
        "name": "IBEX Mailbox Triage",
        "email": "ibex.triage@aoscaustralia.com"
      }
    ],
    "cc": [],
    "bcc": [],
    "subject": "Test Invoice from New Sender",
    "body_plain": "Hello Team, please find our invoice attached.",
    "body_html": "<html><head>\r\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"></head><body><div dir=\"ltr\"><code dir=\"ltr\">Hello Team, please find our invoice attached.</code></div></body></html>",
    "received_at": "2026-11-25T02:37:33Z",
    "is_read": false,
    "has_attachments": false,
    "attachments": [],
    "triage": {
      "category": "Invoice / Finance",
      "priority": "Medium",
      "confidence": 0.69,
      "action_required": false,
      "response_required": false,
      "follow_up_required": false,
      "suggested_action": "Verify invoice details, check ABN and match with accounting records.",
      "due_date": null,
      "summary": "Email from Ayushi Singh regarding 'Test Invoice from New Sender'. Hello Team, please find our invoice attached.",
      "key_points": [
        "Hello Team, please find our invoice attached."
      ],
      "entities": {
        "sender_name": "Ayushi Singh",
        "ai_classification": {
          "document_type": "supplier_invoice",
          "platform_subtype": null,
          "confidence": 0.81,
          "status": "needs_review",
          "client": {
            "client_id": null,
            "entity_id": null,
            "group_id": null,
            "client_name": null,
            "confidence": 0.0,
            "match_basis": "unmatched",
            "matched_value": null
          },
          "extracted_fields": {
            "supplier_name": "Hello Team, please find our",
            "abn": null,
            "reference": "attached",
            "document_date": null,
            "period_start": null,
            "period_end": null,
            "financial_year": null,
            "amount_total": null,
            "gst": null
          },
          "sensitivity": "normal",
          "suggested_job_ref": null,
          "review_reasons": [
            "Client confidence (0.00) below threshold (0.95)",
            "Document type confidence (0.81) below threshold (0.85)"
          ]
        }
      },
      "triaged_at": "2026-11-25T02:37:43.763310+00:00"
    },
    "processing_status": "TRIAGED",
    "error_message": "",
    "retry_count": 0,
    "created_at": "2026-11-25T02:37:39.466218+00:00",
    "updated_at": "2026-11-25T02:37:39.466221+00:00"
  },
  {
    "internal_id": "7ae2545c79cb4a0bbe4d07f46e0ee034",
    "graph_message_id": "AAMkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgBGAAAAAABav9etF8t-SKPKIR1vHjnQBwB85UnBCohpQqam-W0465BRAAAAAAEMAAB85UnBCohpQqam-W0465BRAAAAAAVRAAA=",
    "internet_message_id": "<CAFjUDf5H8Nikm-2S5OXGradtzsomhy5ZGJofG0zCVHJvA=0dYw@mail.gmail.com>",
    "conversation_id": "AAQkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgAQADsrNi6E8gNKj01RJu_j1PE=",
    "sender_name": "Chandni Poddar",
    "sender_email": "poddarchandni5@gmail.com",
    "recipients": [
      {
        "name": "IBEX Mailbox Triage",
        "email": "ibex.triage@aoscaustralia.com"
      }
    ],
    "cc": [],
    "bcc": [],
    "subject": "Re: Urgent: FY26 Tax Invoice #1042 - Acme Pty Ltd",
    "body_plain": "doc is ok\nOn Tue, 24 Nov 2026 at 12:36, Chandni Poddar < poddarchandni5@gmail.com > wrote:\ni will check the doc\nOn Tue, 24 Nov 2026 at 10:26, Chandni Poddar < poddarchandni5@gmail.com > wrote:\nHi Team,\nPlease find attached our tax invoice for $12,500.00 AUD (including $1,136.36 GST) for Acme Holdings Pty Ltd.\nPayment is due by 30 November. Could you please reconcile and confirm receipt?",
    "body_html": "<html><head>\r\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"></head><body><div dir=\"ltr\">doc is ok<div><br></div></div><br><div class=\"gmail_quote gmail_quote_container\"><div dir=\"ltr\" class=\"gmail_attr\">On Tue, 24 Nov 2026 at 12:36, Chandni Poddar &lt;<a href=\"mailto:poddarchandni5@gmail.com\">poddarchandni5@gmail.com</a>&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin:0px 0px 0px 0.8ex; border-left:1px solid rgb(204,204,204); padding-left:1ex\"><div dir=\"ltr\">i will check the doc<div><br></div></div><br><div class=\"gmail_quote\"><div dir=\"ltr\" class=\"gmail_attr\">On Tue, 24 Nov 2026 at 10:26, Chandni Poddar &lt;<a href=\"mailto:poddarchandni5@gmail.com\" target=\"_blank\">poddarchandni5@gmail.com</a>&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin:0px 0px 0px 0.8ex; border-left:1px solid rgb(204,204,204); padding-left:1ex\"><div dir=\"ltr\"><span>Hi </span><span>Team,</span><span><br></span><span></span><span></span><span>Please </span><span>find </span><span>attached </span><span>our </span><span>tax </span><span>invoice </span><span>for </span><span>$12,500.00 </span><span>AUD </span><span>(including </span><span>$1,136.36 </span><span>GST) </span><span>for </span><span>Acme </span><span>Holdings </span><span>Pty </span><span>Ltd.</span><span><br></span><span></span><span></span><span>Payment </span><span>is </span><span>due </span><span>by </span><span>30 </span><span>November. </span><span>Could </span><span>you </span><span>please </span><span>reconcile </span><span>and </span><span>confirm </span><span>receipt?</span></div></blockquote></div></blockquote></div></body></html>",
    "received_at": "2026-11-24T08:43:00Z",
    "is_read": false,
    "has_attachments": false,
    "attachments": [],
    "triage": {
      "category": "Urgent",
      "priority": "Critical",
      "confidence": 0.93,
      "action_required": true,
      "response_required": true,
      "follow_up_required": false,
      "suggested_action": "Review immediately and respond to sender.",
      "due_date": "30 November",
      "summary": "Email from Chandni Poddar regarding 'Re: Urgent: FY26 Tax Invoice #1042 - Acme Pty Ltd'. doc is ok\nOn Tue, 24 Nov 2026 at 12:36, Chandni Poddar < poddarchandni5@gmail.com > wrote:\ni will check the doc\nOn Tue, 24 Nov 2026 at 10:26, Chandni Poddar < poddarchandni5@gmail.com > wrote:\nHi Team",
      "key_points": [
        "Payment is due by 30 November.",
        "Could you please reconcile and confirm receipt?"
      ],
      "entities": {
        "ai_classification": {
          "document_type": "supplier_invoice",
          "platform_subtype": null,
          "confidence": 0.93,
          "status": "needs_review",
          "client": {
            "client_id": null,
            "entity_id": null,
            "group_id": null,
            "client_name": null,
            "confidence": 0.0,
            "match_basis": "unmatched",
            "matched_value": null
          },
          "extracted_fields": {
            "supplier_name": "doc is ok",
            "abn": null,
            "reference": "for",
            "document_date": "24 Nov 2026",
            "period_start": null,
            "period_end": null,
            "financial_year": "FY2027",
            "amount_total": null,
            "gst": null
          },
          "sensitivity": "normal",
          "suggested_job_ref": null,
          "review_reasons": [
            "Client confidence (0.00) below threshold (0.95)"
          ]
        },
        "due_date": "30 November",
        "amounts": [
          "$12,500.00",
          "$1,136.36"
        ],
        "companies": [
          "Acme Pty Ltd",
          "Acme Holdings Pty Ltd"
        ],
        "sender_name": "Chandni Poddar"
      },
      "triaged_at": "2026-11-24T08:53:42.271611+00:00"
    },
    "processing_status": "INGESTED",
    "error_message": "",
    "retry_count": 0,
    "created_at": "2026-11-25T02:23:29.915671+00:00",
    "updated_at": "2026-11-25T02:23:29.915675+00:00"
  },
  {
    "internal_id": "1d78077072b746bd9962fdef176eecd6",
    "graph_message_id": "AAMkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgBGAAAAAABav9etF8t-SKPKIR1vHjnQBwB85UnBCohpQqam-W0465BRAAAAAAETAAB85UnBCohpQqam-W0465BRAAAAAEPnAAA=",
    "internet_message_id": "<CAFjUDf4PVGiDAEUHkDjXhjFHT0JsjW5=1jtG5HWd7AmFvk7BjA@mail.gmail.com>",
    "conversation_id": "AAQkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgAQAFPKul3TznBOhw9WVGuyRDo=",
    "sender_name": "Chandni Poddar",
    "sender_email": "poddarchandni5@gmail.com",
    "recipients": [
      {
        "name": "IBEX Mailbox Triage",
        "email": "ibex.triage@aoscaustralia.com"
      }
    ],
    "cc": [],
    "bcc": [],
    "subject": "URGENT: Outstanding Invoice INV-2026-1042 – Payment Due Today",
    "body_plain": "Hi Accounts Team,\nI am following up regarding invoice INV-2026-1042 for AUD 4,850.00, which was issued on 10 November 2026.\nThe payment is due today, 24 November 2026. Could you please confirm whether the payment has been processed?\nIf payment has already been made, kindly share the transaction reference.\nPlease treat this as urgent, as we need to close our accounts for this month.\nRegards,\nJames Wilson\nFinance Manager\nWilson & Associates\nPhone: +61 412 345 678",
    "body_html": "<html><head>\r\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"></head><body><div dir=\"ltr\"><p>Hi Accounts Team,</p><p>I am following up regarding invoice INV-2026-1042 for AUD 4,850.00, which was issued on 10 November 2026.</p><p>The payment is due today, 24 November 2026. Could you please confirm whether the payment has been processed?</p><p>If payment has already been made, kindly share the transaction reference.</p><p>Please treat this as urgent, as we need to close our accounts for this month.</p><p>Regards,</p><p>James Wilson<br>Finance Manager<br>Wilson &amp; Associates<br>Phone: +61 412 345 678</p></div></body></html>",
    "received_at": "2026-11-24T08:29:20Z",
    "is_read": true,
    "has_attachments": false,
    "attachments": [],
    "triage": {
      "category": "Urgent",
      "priority": "Critical",
      "confidence": 0.71,
      "action_required": true,
      "response_required": true,
      "follow_up_required": false,
      "suggested_action": "Review immediately and respond to sender.",
      "due_date": null,
      "summary": "Email from Chandni Poddar regarding 'URGENT: Outstanding Invoice INV-2026-1042 – Payment Due Today'. Hi Accounts Team,\nI am following up regarding invoice INV-2026-1042 for AUD 4,850.00, which was issued on 10 November 2026.",
      "key_points": [
        "The payment is due today, 24 November 2026.",
        "Could you please confirm whether the payment has been processed?",
        "If payment has already been made, kindly share the transaction reference."
      ],
      "entities": {
        "amounts": [
          "$4,850.00"
        ],
        "sender_name": "Chandni Poddar",
        "ai_classification": {
          "document_type": "signed_return",
          "platform_subtype": null,
          "confidence": 0.4,
          "status": "needs_review",
          "client": {
            "client_id": null,
            "entity_id": null,
            "group_id": null,
            "client_name": null,
            "confidence": 0.0,
            "match_basis": "unmatched",
            "matched_value": null
          },
          "extracted_fields": {
            "supplier_name": "Hi Accounts Team,",
            "abn": "61 412 345 678",
            "reference": "INV-2026-1042",
            "document_date": "10 November 2026",
            "period_start": null,
            "period_end": null,
            "financial_year": "FY2027",
            "amount_total": null,
            "gst": null
          },
          "sensitivity": "normal",
          "suggested_job_ref": null,
          "review_reasons": [
            "Client confidence (0.00) below threshold (0.95)",
            "Document type confidence (0.40) below threshold (0.85)"
          ]
        }
      },
      "triaged_at": "2026-11-25T02:23:34.852750+00:00"
    },
    "processing_status": "TRIAGED",
    "error_message": "",
    "retry_count": 0,
    "created_at": "2026-11-25T02:23:31.208109+00:00",
    "updated_at": "2026-11-25T02:23:31.208113+00:00"
  },
  {
    "internal_id": "63f288ed605340e98325841338efa8c4",
    "graph_message_id": "AAMkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgBGAAAAAABav9etF8t-SKPKIR1vHjnQBwB85UnBCohpQqam-W0465BRAAAAAAEMAAB85UnBCohpQqam-W0465BRAAAAAAVQAAA=",
    "internet_message_id": "<CAFjUDf7JCsAxA+Tq6d26Oy2ogBd6V3JRgd=5KEDC-Ac0yvU3CQ@mail.gmail.com>",
    "conversation_id": "AAQkADk1MTdhNDk0LWMzNTktNGI1Zi05MmYxLTA0OWQzZGM4NGNkYgAQADsrNi6E8gNKj01RJu_j1PE=",
    "sender_name": "Chandni Poddar",
    "sender_email": "poddarchandni5@gmail.com",
    "recipients": [
      {
        "name": "IBEX Mailbox Triage",
        "email": "ibex.triage@aoscaustralia.com"
      }
    ],
    "cc": [],
    "bcc": [],
    "subject": "Re: Urgent: FY26 Tax Invoice #1042 - Acme Pty Ltd",
    "body_plain": "i will check the doc\nOn Tue, 24 Nov 2026 at 10:26, Chandni Poddar < poddarchandni5@gmail.com > wrote:\nHi Team,\nPlease find attached our tax invoice for $12,500.00 AUD (including $1,136.36 GST) for Acme Holdings Pty Ltd.\nPayment is due by 30 November. Could you please reconcile and confirm receipt?",
    "body_html": "<html><head>\r\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\"></head><body><div dir=\"ltr\">i will check the doc<div><br></div></div><br><div class=\"gmail_quote gmail_quote_container\"><div dir=\"ltr\" class=\"gmail_attr\">On Tue, 24 Nov 2026 at 10:26, Chandni Poddar &lt;<a href=\"mailto:poddarchandni5@gmail.com\">poddarchandni5@gmail.com</a>&gt; wrote:<br></div><blockquote class=\"gmail_quote\" style=\"margin:0px 0px 0px 0.8ex; border-left:1px solid rgb(204,204,204); padding-left:1ex\"><div dir=\"ltr\"><span>Hi </span><span>Team,</span><span><br></span><span></span><span></span><span>Please </span><span>find </span><span>attached </span><span>our </span><span>tax </span><span>invoice </span><span>for </span><span>$12,500.00 </span><span>AUD </span><span>(including </span><span>$1,136.36 </span><span>GST) </span><span>for </span><span>Acme </span><span>Holdings </span><span>Pty </span><span>Ltd.</span><span><br></span><span></span><span></span><span>Payment </span><span>is </span><span>due </span><span>by </span><span>30 </span><span>November. </span><span>Could </span><span>you </span><span>please </span><span>reconcile </span><span>and </span><span>confirm </span><span>receipt?</span></div></blockquote></div></body></html>",
    "received_at": "2026-11-24T08:05:44Z",
    "is_read": true,
    "has_attachments": false,
    "attachments": [],
    "triage": {
      "category": "Urgent",
      "priority": "Critical",
      "confidence": 0.93,
      "action_required": true,
      "response_required": true,
      "follow_up_required": false,
      "suggested_action": "Review immediately and respond to sender.",
      "due_date": "30 November",
      "summary": "Email from Chandni Poddar regarding 'Re: Urgent: FY26 Tax Invoice #1042 - Acme Pty Ltd'. i will check the doc\nOn Tue, 24 Nov 2026 at 10:26, Chandni Poddar < poddarchandni5@gmail.com > wrote:\nHi Team,\nPlease find attached our tax invoice for $12,500.00 AUD (including $1,136.36 GST) for Acm",
      "key_points": [
        "Payment is due by 30 November.",
        "Could you please reconcile and confirm receipt?"
      ],
      "entities": {
        "ai_classification": {
          "document_type": "supplier_invoice",
          "platform_subtype": null,
          "confidence": 0.93,
          "status": "needs_review",
          "client": {
            "client_id": null,
            "entity_id": null,
            "group_id": null,
            "client_name": null,
            "confidence": 0.0,
            "match_basis": "unmatched",
            "matched_value": null
          },
          "extracted_fields": {
            "supplier_name": "i will check the doc",
            "abn": null,
            "reference": "for",
            "document_date": "24 Nov 2026",
            "period_start": null,
            "period_end": null,
            "financial_year": "FY2027",
            "amount_total": null,
            "gst": null
          },
          "sensitivity": "normal",
          "suggested_job_ref": null,
          "review_reasons": [
            "Client confidence (0.00) below threshold (0.95)"
          ]
        },
        "due_date": "30 November",
        "amounts": [
          "$12,500.00",
          "$1,136.36"
        ],
        "companies": [
          "Acme Pty Ltd",
          "Acme Holdings Pty Ltd"
        ],
        "sender_name": "Chandni Poddar"
      },
      "triaged_at": "2026-11-24T08:53:43.280364+00:00"
    },
    "processing_status": "INGESTED",
    "error_message": "",
    "retry_count": 0,
    "created_at": "2026-11-25T02:23:29.920977+00:00",
    "updated_at": "2026-11-25T02:23:29.920980+00:00"
  }
];
