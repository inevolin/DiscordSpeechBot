#!/bin/sh

screen -SX discordspeechbot quit
screen -S discordspeechbot -dmL node index.js
screen -wipe
