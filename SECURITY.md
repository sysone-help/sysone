# Security

Do not post API credentials, private input text, or exploitable vulnerabilities in public issues.

Use GitHub's private vulnerability reporting for this repository. If unavailable, contact the maintainer through the contact information on their GitHub profile.

The library runs evaluation requests using caller-owned credentials. Keep keys on your server. The hosted playground uses a server-side key, bounded requests and Vercel Firewall rate limiting. Inputs are sent through the selected provider; provider retention policies apply. Sysone does not promise zero retention by the underlying infrastructure.

Only the latest release receives fixes during the pre-1.0 phase. Provider dependencies, especially experimental evaluation interfaces, are tested before upgrades.
