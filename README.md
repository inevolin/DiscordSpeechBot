# DiscordSpeechBot
A speech-to-text bot for discord with music commands and more using NodeJS.

## Installation

### Prerequisites
You need nodeJS version 12+ with npm on your machine.
```
sudo apt-get install ffmpeg sox screen
```

### Installation
```
git clone https://github.com/healzer/DiscordSpeechBot.git
cd DiscordSpeechBot
npm install
```

### Settings
Create a (free) discord bot and obtain the API credentials. Here's an easy tutorial: https://www.writebots.com/discord-bot-token/
Note: Give your bot enough permissions or simply grant it Administrator rights.

Create a (free) Spotify developers account to obtain the API credentials: https://developer.spotify.com/dashboard/

Create a (free) WitAI account and obtain the API credentials: https://wit.ai/

Rename the file `settings-sample.json` to `settings.json` and enter the obtained API credentials:
```
{
    "discord_token": "your_token",
    "spotify_token_id": "your_token_id",
    "spotify_token_secret": "your_token_secret",
    "wit_ai_token": "your_token"
}
```

### Running
Development mode (logging to console):
```
node voice.js
```

Production mode (logging to screenlog file):
```
./restart.sh     # this (re)starts a new background screen session of the bot, closing your terminal will keep the process running.

./close.sh       # this closes the background screen session.
```
