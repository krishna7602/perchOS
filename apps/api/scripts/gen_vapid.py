import os
import base64
from cryptography.hazmat.primitives.asymmetric import ec

private_key = ec.generate_private_key(ec.SECP256R1())
private_numbers = private_key.private_numbers()
public_numbers = private_key.public_key().public_numbers()

def to_base64url(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode('ascii')

priv_bytes = private_numbers.private_value.to_bytes(32, 'big')
pub_bytes = b'\x04' + public_numbers.x.to_bytes(32, 'big') + public_numbers.y.to_bytes(32, 'big')

print("VAPID_PRIVATE_KEY=" + to_base64url(priv_bytes))
print("VAPID_PUBLIC_KEY=" + to_base64url(pub_bytes))
print("VAPID_CLAIM_EMAIL=mailto:admin@perch.com")
