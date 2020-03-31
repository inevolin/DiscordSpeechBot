#!/bin/sh

kill -9 $(ps aux |grep discordspeechbot | awk '{print $2}')
screen -wipe
