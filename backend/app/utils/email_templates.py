"""
Email templates for various application notifications and features.

This module contains functions that generate HTML and plain text email templates
for different purposes like authentication codes, password resets, etc.
"""


def get_auth_code_email(user_name: str, code: str, expires_minutes: int) -> tuple[str, str]:
	"""
	Generate HTML and plain text templates for authentication code emails.

	Args:
	    user_name: The name of the user receiving the code
	    code: The authentication code
	    expires_minutes: The expiration time in minutes

	Returns:
	    tuple[str, str]: A tuple containing (html_content, text_content)
	"""
	# HTML version
	html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Hello {user_name},</h2>
                <p>Your authentication code is: <strong style="font-size: 18px; letter-spacing: 2px;">{code}</strong></p>
                <p>This code will expire in {expires_minutes} minutes.</p>
                <p style="color: #777; font-size: 14px;">If you did not request this code, please ignore this email.</p>
            </div>
        </body>
    </html>
    """

	# Plain text version
	text_content = f"""
    Hello {user_name},

    Your authentication code is: {code}

    This code will expire in {expires_minutes} minutes.

    If you did not request this code, please ignore this email.
    """

	return html_content, text_content


def get_password_reset_email(user_name: str, code: str, expires_minutes: int) -> tuple[str, str]:
	"""
	Generate HTML and plain text templates for password reset emails.

	Args:
	    user_name: The name of the user receiving the code
	    code: The reset code
	    expires_minutes: The expiration time in minutes

	Returns:
	    tuple[str, str]: A tuple containing (html_content, text_content)
	"""
	# HTML version
	html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2>Hello {user_name},</h2>
                <p>You recently requested to reset your password.</p>
                <p>Your password reset code is: <strong style="font-size: 18px; letter-spacing: 2px;">{code}</strong></p>
                <p>This code will expire in {expires_minutes} minutes.</p>
                <p style="color: #777; font-size: 14px;">If you did not request a password reset, please ignore this email or contact support.</p>
            </div>
        </body>
    </html>
    """

	# Plain text version
	text_content = f"""
    Hello {user_name},

    You recently requested to reset your password.

    Your password reset code is: {code}

    This code will expire in {expires_minutes} minutes.

    If you did not request a password reset, please ignore this email or contact support.
    """

	return html_content, text_content
