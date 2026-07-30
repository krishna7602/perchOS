import random

# Adjective + Animal combos for anonymous handles (~300 combinations)
_ADJECTIVES = [
    "Quiet", "Bold", "Gentle", "Swift", "Calm", "Bright", "Warm", "Cool",
    "Lucky", "Happy", "Witty", "Keen", "Brave", "Shy", "Wild", "Cozy",
    "Mellow", "Lively", "Clever", "Daring", "Fierce", "Noble", "Humble",
    "Jolly", "Sleepy", "Sneaky", "Zesty", "Chill", "Funky", "Peppy",
]

_ANIMALS = [
    "Otter", "Sparrow", "Fox", "Panda", "Owl", "Koala", "Falcon", "Badger",
    "Dolphin", "Heron", "Lynx", "Rabbit", "Wolf", "Bear", "Hawk", "Deer",
    "Crane", "Finch", "Seal", "Dove", "Parrot", "Raven", "Tiger", "Swan",
    "Penguin", "Sloth", "Gecko", "Toucan", "Moose", "Wren",
]

# Basic keyword blocklist for moderation (extend as needed)
_BLOCKED_WORDS = {
    "spam", "scam", "phishing",
    # Add actual slurs / profanity here in production
    # Keeping this minimal for the dev build
}


def generate_anon_handle() -> str:
    """Generate a random anonymous handle like 'Quiet Otter'.

    Centralized on the server to prevent handle collisions
    and enable moderation of generated names.
    """
    adj = random.choice(_ADJECTIVES)
    animal = random.choice(_ANIMALS)
    # Append a short random number to reduce collision probability
    suffix = random.randint(10, 99)
    return f"{adj} {animal} {suffix}"


def moderate_message(body: str) -> str:
    """Check a message body against moderation rules.

    Returns:
        "allow" if the message passes moderation.
        A reason string if the message is rejected.
    """
    if not body or not body.strip():
        return "empty_message"

    if len(body) > 2000:
        return "message_too_long"

    # Case-insensitive keyword check
    lower_body = body.lower()
    for word in _BLOCKED_WORDS:
        if word in lower_body:
            return "blocked_content"

    return "allow"
