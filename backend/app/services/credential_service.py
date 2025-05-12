import base64
from typing import Optional

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from app.core.config import settings


class CredentialService:
	"""
	Service for encrypting and decrypting sensitive data using AES encryption.
	Uses the CREDS_KEY and CREDS_IV from settings.
	"""

	def __init__(self, key: Optional[str] = None, iv: Optional[str] = None):
		"""
		Initialize the credential service with encryption key and initialization vector.

		Args:
		    key: Base64 encoded string for the encryption key.
		         Defaults to settings.CREDS_KEY if not provided.
		    iv: Base64 encoded string for the initialization vector.
		        Defaults to settings.CREDS_IV if not provided.
		"""
		self.key = base64.urlsafe_b64decode(key or settings.CREDS_KEY)
		self.iv = base64.urlsafe_b64decode(iv or settings.CREDS_IV)

	def encrypt(self, plain_text: str) -> str:
		"""
		Encrypt a string value using AES encryption.

		Args:
		    plain_text: The string to encrypt

		Returns:
		    Base64 encoded encrypted string
		"""
		if not plain_text:
			return ''

		# Convert string to bytes
		plain_bytes = plain_text.encode('utf-8')

		# Add padding to ensure the data is a multiple of the block size
		padder = padding.PKCS7(algorithms.AES.block_size).padder()
		padded_data = padder.update(plain_bytes) + padder.finalize()

		# Create encryptor
		cipher = Cipher(algorithms.AES(self.key), modes.CBC(self.iv), backend=default_backend())
		encryptor = cipher.encryptor()

		# Encrypt the data
		encrypted_bytes = encryptor.update(padded_data) + encryptor.finalize()

		# Encode as base64 for storage/transmission
		return base64.urlsafe_b64encode(encrypted_bytes).decode('utf-8')

	def decrypt(self, encrypted_text: str) -> str:
		"""
		Decrypt an encrypted string value.

		Args:
		    encrypted_text: Base64 encoded encrypted string

		Returns:
		    The decrypted string
		"""
		if not encrypted_text:
			return ''

		# Decode from base64
		encrypted_bytes = base64.urlsafe_b64decode(encrypted_text)

		# Create decryptor
		cipher = Cipher(algorithms.AES(self.key), modes.CBC(self.iv), backend=default_backend())
		decryptor = cipher.decryptor()

		# Decrypt the data
		decrypted_padded_bytes = decryptor.update(encrypted_bytes) + decryptor.finalize()

		# Remove padding
		unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
		decrypted_bytes = unpadder.update(decrypted_padded_bytes) + unpadder.finalize()

		# Convert bytes back to string
		return decrypted_bytes.decode('utf-8')


# Create a singleton instance for the application to use
credential_service = CredentialService()
