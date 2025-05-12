import base64
from typing import List, Optional

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from sqlmodel import Session, select

from app.core.config import settings
from app.models.credential import Credential
from app.utils.datetime import datetime_utcnow


class CredentialService:
	"""
	Service for managing credentials, including:
	- Encrypting and decrypting sensitive data using AES encryption
	- Database operations for storing and retrieving credentials
	"""

	def __init__(
		self, db: Optional[Session] = None, key: Optional[str] = None, iv: Optional[str] = None
	):
		"""
		Initialize the credential service with encryption key and initialization vector.

		Args:
		    db: The database session to use for database operations
		    key: Base64 encoded string for the encryption key.
		         Defaults to settings.CREDS_KEY if not provided.
		    iv: Base64 encoded string for the initialization vector.
		        Defaults to settings.CREDS_IV if not provided.
		"""
		self.db = db
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

	# Database operations

	def get_credential(self, key: str) -> Optional[Credential]:
		"""
		Get a credential by its key.

		Args:
		    key: The key of the credential to retrieve

		Returns:
		    The credential object if found, None otherwise
		"""
		if not self.db:
			raise ValueError('Database session is required for this operation')

		statement = select(Credential).where(Credential.key == key)
		credential = self.db.exec(statement).first()

		return credential

	def get_credential_value(self, key: str) -> Optional[str]:
		"""
		Get the value of a credential by its key.
		If the credential is encrypted, it will be decrypted before returning.

		Args:
		    key: The key of the credential to retrieve

		Returns:
		    The credential value if found, None otherwise
		"""
		if not self.db:
			raise ValueError('Database session is required for this operation')

		credential = self.get_credential(key)

		if credential:
			value = credential.value
			if credential.is_value_encrypted:
				value = self.decrypt(value)
			return value

		return None

	def set_credential(
		self, key: str, value: str, should_encrypt: bool = False, description: Optional[str] = None
	) -> Credential:
		"""
		Create or update a credential.

		Args:
		    key: The key of the credential
		    value: The value to store
		    should_encrypt: Whether the value should be encrypted
		    description: An optional description of the credential

		Returns:
		    The created or updated credential object
		"""
		if not self.db:
			raise ValueError('Database session is required for this operation')

		stored_value = value
		if should_encrypt:
			stored_value = self.encrypt(value)

		# Check if credential with this key already exists
		existing_credential = self.get_credential(key)

		if existing_credential:
			# Update the existing credential
			existing_credential.value = stored_value
			existing_credential.is_value_encrypted = should_encrypt
			existing_credential.updated_at = datetime_utcnow()
			if description is not None:
				existing_credential.description = description

			self.db.add(existing_credential)
			self.db.commit()
			self.db.refresh(existing_credential)
			return existing_credential
		else:
			# Create a new credential
			credential = Credential(
				key=key,
				value=stored_value,
				is_value_encrypted=should_encrypt,
				description=description,
			)

			self.db.add(credential)
			self.db.commit()
			self.db.refresh(credential)
			return credential

	def delete_credential(self, key: str) -> bool:
		"""
		Delete a credential by its key.

		Args:
		    key: The key of the credential to delete

		Returns:
		    True if the credential was deleted, False if it wasn't found
		"""
		if not self.db:
			raise ValueError('Database session is required for this operation')

		credential = self.get_credential(key)

		if credential:
			self.db.delete(credential)
			self.db.commit()
			return True

		return False

	def list_credentials(self, include_values: bool = False) -> List[dict]:
		"""
		List all credentials.

		Args:
		    include_values: Whether to include (and decrypt if needed) the credential values

		Returns:
		    A list of credential objects with or without their values
		"""
		if not self.db:
			raise ValueError('Database session is required for this operation')

		statement = select(Credential)
		credentials = self.db.exec(statement).all()

		result = []
		for cred in credentials:
			cred_dict = {
				'id': str(cred.id),
				'key': cred.key,
				'is_value_encrypted': cred.is_value_encrypted,
				'created_at': cred.created_at,
				'updated_at': cred.updated_at,
				'description': cred.description,
			}

			if include_values:
				value = cred.value
				if cred.is_value_encrypted:
					value = self.decrypt(value)
				cred_dict['value'] = value

			result.append(cred_dict)

		return result
