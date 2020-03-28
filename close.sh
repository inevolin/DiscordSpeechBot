#!/bin/sh

kill -9 $(ps aux |grep voice.js | awk '{print $2}')
screen -wipe
