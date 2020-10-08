# DiscordSpeechBot
A speech-to-text bot for discord with music commands and more written in NodeJS.

## Demo:

[![Discord Speech Bot Demo](http://img.youtube.com/vi/cfFI7E32v_8/0.jpg)](http://www.youtube.com/watch?v=cfFI7E32v_8 "Discord Speech Bot Demo")

Try the bot for yourself on our Discord server: https://discord.gg/ApdTMG9

You can follow the steps below to get this bot up and running.

## Heroku (optional)
If you don't have a linux server/machine then you can use Heroku for hosting your bot 24/7 and it's free.
I wrote an easy step-by-step guide [here](https://medium.com/@ilyanevolin/deploying-my-discord-bots-on-heroku-105752941706).

## Docker (optional)
If you prefer using Docker instead of manually installing it:
1. Save the `Dockerfile`
2. Create a file `settings.json` and configure it (see Settings part)
3. run `docker build -t discordspeechbot .`  this may take a minute or two.
4. run `docker run -it discordspeechbot`
5. skip to Usage part.

## Linux Installation
You need nodeJS version 12+ with npm on your machine.
```
sudo apt-get install -y ffmpeg sox screen
git clone https://github.com/healzer/DiscordSpeechBot.git
cd DiscordSpeechBot
npm install
```

## Windows Installation

Tutorial: https://www.youtube.com/watch?v=uD_Neq9DYn0

You need nodeJS version 12+ with npm on your machine.

Download and install the latest version of "sox" for Windows: https://sourceforge.net/projects/sox/files/sox/

You may need to manually add sox to your environment variables, here's a tutorial: https://stackoverflow.com/questions/17667491/how-to-use-sox-in-windows

Using shell or command prompt execute the following:
```
git clone https://github.com/healzer/DiscordSpeechBot.git
cd DiscordSpeechBot
npm install
```

## Settings
Create a (free) discord bot and obtain the API credentials (Bot Token).
Here's an easy tutorial: https://www.writebots.com/discord-bot-token/
Note: Give your bot enough permissions or simply grant it Administrator rights.

Create a (free) Spotify developers account to obtain the API credentials (Client Id and Client Secret): https://developer.spotify.com/dashboard/

Create a (free) WitAI account and obtain the API credentials (Server Access Token): https://wit.ai/

Rename the file `settings-sample.json` to `settings.json` and enter the obtained API credentials:
```
{
    "discord_token": "your_token",
    "spotify_token_id": "your_token_id",
    "spotify_token_secret": "your_token_secret",
    "wit_ai_token": "your_token"
}
```

## Running

Execute the following in your shell or prompt:
```
node index.js
```

Linux users can start background process as such:
```
./restart.sh     # this (re)starts a new background screen session of the bot, closing your terminal will keep the process running.

./close.sh       # this closes the background screen session.
```

## Usage
By now you have a discord server, the DiscordSpeechBot is running and is a part of your server.
Make sure your server has a text and voice channel.

1. Enter one of your voice channels.
2. In one of your text channels type: `!join`
3. Type `!help` for a list of commands.

Examples:

```
!play https://www.youtube.com/watch?v=vK1YiArMDfg
!play red hot chili peppers californication
!list
!skip
```

### Voice commands

When the bot is inside a voice channel it listens to all speech and tries to detect commands.

Try saying:
```
music play 'the chemical brothers'
music skip
music play random
music list
music clear list
```

A successful voice command looks like this:

`<long pause>   music play 'justin timberlake cry river'   <long pause>`

### Notes: 
- Each voice command starts with `music`.
- Each user talks to a separate channel, the bot hears every user separately.
- Only when your user picture turns green in the voice channel will the bot receive your audio.
- A long pause interrupts the audio input.
- (WitAI only) The duration of a single audio input is limited to 20 seconds, longer audio is not transcribed.

Here are some examples which may not work (properly):
```
<talking> music skip
music skip <talking>
<talking> music skip <talking>
...

music play 'the chemical brothers' <talking>

music <long silence>  play  <long silence> 'the chemical brothers'
```


### Notes:
- A successful voice command should contain as little noise before and after the command.
- A successful voice command should should not contain too many/long periods of silence, otherwise the bot will only receive separate words instead of the whole sentence.
- `<long pause>` is usually between 1 and 2 seconds, long enough for discord to stop processing your audio input.
- If you have a very sensitive microphone or a lot of (background) noise, then voice commands may not work properly for you.


## For developers
Music lagging or stuttering? [Try this](https://groovy.zendesk.com/hc/en-us/articles/360023031772-Laggy-Glitchy-Distorted-No-Audio)

Using Mozilla DeepSpeech for speech recognition, [tutorial](https://medium.com/@ilyanevolin/discord-stt-bot-using-mozilla-deepspeech-e77ee28937eb).

### Speech-To-Text

By default WitAI's free API is used for voice recognition / transcription. But you can easily integrate any other API into the bot. You can use Google's Speech-to-Text API as follows:

1. Open `index.js`, inside the function `transcribe(file)` make sure that `transcribe_gspeech` is being used and the other one(s) are disabled.
2. You may want to adjust the `languageCode` value if you're speaking a non-English language.
3. Enable Google Speech API here: https://console.cloud.google.com/apis/library/speech.googleapis.com
4. Create a new Service Account (or use your existing one): https://console.cloud.google.com/apis/credentials
5. Create a new Service Account Key (or use existing) and download the json file.
6. Put the json file inside your bot directory and rename it to `gspeech_key.json`.

## Contact
For enquiries or issues get in touch with me:

Name: Ilya Nevolin

Email: ilja.nevolin@gmail.com

Discord: https://discord.gg/ApdTMG9

