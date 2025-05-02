import time
from collections import defaultdict
from typing import Dict, List, Tuple


class RateLimiter:
	"""
	A simple in-memory rate limiter to protect against brute force attacks.
	Uses a sliding window algorithm to track attempts.
	"""

	def __init__(self, max_attempts: int = 5, window_seconds: int = 300):
		"""
		Initialize the rate limiter.

		Args:
		    max_attempts: Maximum number of attempts allowed in the time window
		    window_seconds: Size of the sliding window in seconds
		"""
		self.max_attempts = max_attempts
		self.window_seconds = window_seconds
		# Store attempts as {key: [(timestamp1), (timestamp2), ...]}
		self._attempts: Dict[str, List[float]] = defaultdict(list)

	def _clean_old_attempts(self, key: str) -> None:
		"""Remove attempts outside the current time window"""
		now = time.time()
		cutoff = now - self.window_seconds
		self._attempts[key] = [ts for ts in self._attempts[key] if ts > cutoff]

	def is_rate_limited(self, key: str) -> Tuple[bool, int]:
		"""
		Check if a key is rate limited.

		Args:
		    key: The unique identifier (e.g., IP address, email, etc.)

		Returns:
		    Tuple[bool, int]: (is_limited, remaining_attempts)
		"""
		self._clean_old_attempts(key)
		attempts = len(self._attempts[key])

		if attempts >= self.max_attempts:
			return True, 0

		return False, self.max_attempts - attempts

	def record_attempt(self, key: str) -> None:
		"""
		Record an authentication attempt.

		Args:
		    key: The unique identifier to track
		"""
		self._attempts[key].append(time.time())

	def reset(self, key: str) -> None:
		"""
		Reset attempts for a key (e.g., after successful login)

		Args:
		    key: The unique identifier to reset
		"""
		if key in self._attempts:
			del self._attempts[key]


# Create a global rate limiter instance with default settings
# 5 failed attempts within 5 minutes will trigger rate limiting
auth_rate_limiter = RateLimiter(max_attempts=5, window_seconds=300)
