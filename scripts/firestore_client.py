"""
How the admin scripts reach Firestore, in one place.

In order:
  - FIRESTORE_EMULATOR_HOST set: the local emulator (npm run emulator in
    frontend/), never the live project.
  - scripts/serviceAccountKey.json present: that key.
  - Otherwise: your own Google login (Application Default Credentials). Set it
    up once, signed in as an account with access to the Firebase project:

        gcloud auth application-default login
        gcloud auth application-default set-quota-project hsa-website-5d15a

    Nothing to download, keep safe or delete afterwards. Undo it with
    `gcloud auth application-default revoke`.
"""
import os
import sys
from pathlib import Path

import firebase_admin
from firebase_admin import credentials, firestore

PROJECT = "hsa-website-5d15a"
EMULATOR_PROJECT = "demo-hsapoints"
KEY = Path(__file__).resolve().parent / "serviceAccountKey.json"


def connect():
    """A Firestore client for whichever of the three is set up. Off the
    emulator it also starts the Admin SDK, so firebase_admin.auth works."""
    if os.environ.get("FIRESTORE_EMULATOR_HOST"):
        from google.auth.credentials import AnonymousCredentials
        from google.cloud import firestore as cloud_firestore
        return cloud_firestore.Client(project=EMULATOR_PROJECT, credentials=AnonymousCredentials())

    if not firebase_admin._apps:
        if KEY.exists():
            firebase_admin.initialize_app(credentials.Certificate(str(KEY)))
        else:
            import google.auth
            from google.auth.exceptions import DefaultCredentialsError
            try:
                google.auth.default()
            except DefaultCredentialsError:
                sys.exit("No Google login for Firestore. Run once:\n"
                         "    gcloud auth application-default login\n"
                         f"    gcloud auth application-default set-quota-project {PROJECT}\n"
                         f"(or put a service account key at {KEY}).")
            firebase_admin.initialize_app(credentials.ApplicationDefault(), {"projectId": PROJECT})
    return firestore.client()
