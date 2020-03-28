FROM ubuntu:latest

RUN mkdir /var/www/
RUN mkdir /var/www/DiscordSpeechBot
WORKDIR /var/www/DiscordSpeechBot

RUN apt update -y
RUN apt upgrade -y
RUN apt update -y
RUN apt install -y git
RUN apt install -y vim
RUN apt install -y ffmpeg
RUN apt install -y sox
RUN apt install -y screen

RUN apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt -y install nodejs

RUN git clone https://github.com/healzer/DiscordSpeechBot.git .

RUN npm install

