import re
from typing import List, Tuple


def validate_password(password: str) -> Tuple[bool, List[str]]:
	"""
	Validates a password against security requirements.

	Requirements:
	- At least 8 characters
	- Must contain a combination of letters, numbers, and/or symbols
	- Cannot begin or end with a blank space

	Args:
	    password: The password to validate

	Returns:
	    A tuple containing:
	    - Boolean indicating if the password is valid
	    - List of validation error messages (empty if password is valid)
	"""
	errors = []

	# Check password length
	if len(password) < 8:
		errors.append('Password must be at least 8 characters long')

	# Check for spaces at beginning or end
	if password.startswith(' ') or password.endswith(' '):
		errors.append('Password cannot begin or end with a blank space')

	# Check for combination of characters
	has_letter = bool(re.search(r'[a-zA-Z]', password))
	has_number = bool(re.search(r'\d', password))
	has_symbol = bool(re.search(r'[^a-zA-Z0-9\s]', password))

	# Password must have at least two of the three categories
	categories_present = [has_letter, has_number, has_symbol].count(True)
	if categories_present < 2:
		errors.append('Password must contain a combination of letters, numbers, and/or symbols')

	return len(errors) == 0, errors
