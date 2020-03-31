FROM ubuntu:latest

RUN mkdir /var/www/
RUN mkdir /var/www/DiscordSpeechBot
WORKDIR /var/www/DiscordSpeechBot

RUN apt -y update
RUN apt install -y git vim ffmpeg sox screen

RUN apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt -y install nodejs

RUN git clone https://github.com/healzer/DiscordSpeechBot.git .

COPY settings.json /var/www/DiscordSpeechBot/settings.json

RUN npm install

CMD ["node", "voice.js"]