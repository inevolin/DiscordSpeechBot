//////////////////////////////////////////
//////////////// LOGGING /////////////////
//////////////////////////////////////////
function getCurrentDateString() {
    return (new Date()).toISOString() + ' ::';
};
__originalLog = console.log;
console.log = function () {
    var args = [].slice.call(arguments);
    __originalLog.apply(console.log, [getCurrentDateString()].concat(args));
};
//////////////////////////////////////////
//////////////////////////////////////////



const fs = require('fs');
const util = require('util');
const path = require('path');
const request = require('request');
const { Readable } = require('stream');

//////////////////////////////////////////
///////////////// VARIA //////////////////
//////////////////////////////////////////

function necessary_dirs() {
    if (!fs.existsSync('./data/')){
        fs.mkdirSync('./data/');
    }
}
necessary_dirs()

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function convert_audio(input) {
    try {
        // stereo to mono channel
        const data = new Int16Array(input)
        const ndata = new Int16Array(data.length/2)
        for (let i = 0, j = 0; i < data.length; i+=4) {
            ndata[j++] = data[i]
            ndata[j++] = data[i+1]
        }
        return Buffer.from(ndata);
    } catch (e) {
        console.log(e)
        console.log('convert_audio: ' + e)
        throw e;
    }
}
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


//////////////////////////////////////////
//////////////// CONFIG //////////////////
//////////////////////////////////////////

const SETTINGS_FILE = 'settings.json';

let DISCORD_TOK = null;
let WITAPIKEY = null; 
let SPOTIFY_TOKEN_ID = null;
let SPOTIFY_TOKEN_SECRET = null;

function loadConfig() {
    if (fs.existsSync(SETTINGS_FILE)) {
        const CFG_DATA = JSON.parse( fs.readFileSync(SETTINGS_FILE, 'utf8') );
        DISCORD_TOK = CFG_DATA.discord_token;
        WITAPIKEY = CFG_DATA.wit_ai_token;
        SPOTIFY_TOKEN_ID = CFG_DATA.spotify_token_id;
        SPOTIFY_TOKEN_SECRET = CFG_DATA.spotify_token_secret;
    } else {
        DISCORD_TOK = process.env.DISCORD_TOK;
        WITAPIKEY = process.env.WITAPIKEY;
        SPOTIFY_TOKEN_ID = process.env.SPOTIFY_TOKEN_ID;
        SPOTIFY_TOKEN_SECRET = process.env.SPOTIFY_TOKEN_SECRET;
    }
    if (!DISCORD_TOK || !WITAPIKEY)
        throw 'failed loading config #113 missing keys!'
    
}
loadConfig()


const https = require('https')
function listWitAIApps(cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps?offset=0&limit=100',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+WITAPIKEY,
      },
    }

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      });
      res.on('end',function() {
        cb(JSON.parse(body))
      })
    })

    req.on('error', (error) => {
      console.error(error)
      cb(null)
    })
    req.end()
}
function updateWitAIAppLang(appID, lang, cb) {
    const options = {
      hostname: 'api.wit.ai',
      port: 443,
      path: '/apps/' + appID,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer '+WITAPIKEY,
      },
    }
    const data = JSON.stringify({
      lang
    })

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      });
      res.on('end',function() {
        cb(JSON.parse(body))
      })
    })
    req.on('error', (error) => {
      console.error(error)
      cb(null)
    })
    req.write(data)
    req.end()
}

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


const Discord = require('discord.js')
const DISCORD_MSG_LIMIT = 2000;
const discordClient = new Discord.Client()
discordClient.on('ready', () => {
    console.log(`Logged in as ${discordClient.user.tag}!`)
})
discordClient.login(DISCORD_TOK)

const PREFIX = '!';
const _CMD_HELP        = PREFIX + 'help';
const _CMD_JOIN        = PREFIX + 'join';
const _CMD_LEAVE       = PREFIX + 'leave';
const _CMD_PLAY        = PREFIX + 'play';
const _CMD_PAUSE       = PREFIX + 'pause';
const _CMD_RESUME      = PREFIX + 'resume';
const _CMD_SHUFFLE     = PREFIX + 'shuffle';
const _CMD_FAVORITE    = PREFIX + 'favorite';
const _CMD_UNFAVORITE  = PREFIX + 'unfavorite';
const _CMD_FAVORITES   = PREFIX + 'favorites';
const _CMD_GENRE       = PREFIX + 'genre';
const _CMD_GENRES      = PREFIX + 'genres';
const _CMD_CLEAR       = PREFIX + 'clear';
const _CMD_RANDOM      = PREFIX + 'random';
const _CMD_SKIP        = PREFIX + 'skip';
const _CMD_QUEUE       = PREFIX + 'list';
const _CMD_DEBUG       = PREFIX + 'debug';
const _CMD_TEST        = PREFIX + 'hello';
const _CMD_LANG        = PREFIX + 'lang';
const PLAY_CMDS = [_CMD_PLAY, _CMD_PAUSE, _CMD_RESUME, _CMD_SHUFFLE, _CMD_SKIP, _CMD_GENRE, _CMD_GENRES, _CMD_RANDOM, _CMD_CLEAR, _CMD_QUEUE, _CMD_FAVORITE, _CMD_FAVORITES, _CMD_UNFAVORITE];

const EMOJI_GREEN_CIRCLE = '🟢'
const EMOJI_RED_CIRCLE = '🔴'

const GENRES = {
    'hip-hop': ['hip-hop', 'hip hop', 'hiphop', 'rap'],
    'rock': ['rock'],
    'dance': ['dance'],
    'trance': ['techno'],
    'trance': ['trance'],
    'groove': ['groove'],
    'classical': ['classical'],
    'techno': ['techno'],

}

const guildMap = new Map();

discordClient.on('message', async (msg) => {
    try {
        if (!('guild' in msg) || !msg.guild) return; // prevent private messages to bot
        const mapKey = msg.guild.id;
        if (msg.content.trim().toLowerCase() == _CMD_JOIN) {
            if (!msg.member.voice.channelID) {
                msg.reply('Error: please join a voice channel first.')
            } else {
                if (!guildMap.has(mapKey))
                    await connect(msg, mapKey)
                else
                    msg.reply('Already connected')
            }
        } else if (msg.content.trim().toLowerCase() == _CMD_LEAVE) {
            if (guildMap.has(mapKey)) {
                let val = guildMap.get(mapKey);
                if (val.voice_Channel) val.voice_Channel.leave()
                if (val.voice_Connection) val.voice_Connection.disconnect()
                if (val.musicYTStream) val.musicYTStream.destroy()
                    guildMap.delete(mapKey)
                msg.reply("Disconnected.")
            } else {
                msg.reply("Cannot leave because not connected.")
            }
        }
        else if ( PLAY_CMDS.indexOf( msg.content.trim().toLowerCase().split('\n')[0].split(' ')[0] ) >= 0 ) {
            if (!msg.member.voice.channelID) {
                msg.reply('Error: please join a voice channel first.')
            } else {
                if (!guildMap.has(mapKey))
                    await connect(msg, mapKey)
                music_message(msg, mapKey);
            }
        } else if (msg.content.trim().toLowerCase() == _CMD_HELP) {
            msg.reply(getHelpString());
        }
        else if (msg.content.trim().toLowerCase() == _CMD_DEBUG) {
            console.log('toggling debug mode')
            let val = guildMap.get(mapKey);
            if (val.debug)
                val.debug = false;
            else
                val.debug = true;
        }
        else if (msg.content.trim().toLowerCase() == _CMD_TEST) {
            msg.reply('hello back =)')
        }
        else if (msg.content.split('\n')[0].split(' ')[0].trim().toLowerCase() == _CMD_LANG) {
            const lang = msg.content.replace(_CMD_LANG, '').trim().toLowerCase()
            listWitAIApps(data => {
              if (!data.length)
                return msg.reply('no apps found! :(')
              for (const x of data) {
                updateWitAIAppLang(x.id, lang, data => {
                  if ('success' in data)
                    msg.reply('succes!')
                  else if ('error' in data && data.error !== 'Access token does not match')
                    msg.reply('Error: ' + data.error)
                })
              }
            })
        }
    } catch (e) {
        console.log('discordClient message: ' + e)
        msg.reply('Error#180: Something went wrong, try again or contact the developers if this keeps happening.');
    }
})

function getHelpString() {
    let out = '**VOICE COMMANDS:**\n'
        out += '```'
        out += 'music help\n'
        out += 'music play [random, favorites, <genre> or query]\n'
        out += 'music skip\n'
        out += 'music pause/resume\n'
        out += 'music shuffle\n'
        out += 'music genres\n'
        out += 'music set favorite\n'
        out += 'music favorites\n'
        out += 'music list\n'
        out += 'music clear list\n';
        out += '```'

        out += '**TEXT COMMANDS:**\n'
        out += '```'
        out += _CMD_HELP + '\n'
        out += _CMD_JOIN + '/' + _CMD_LEAVE + '\n'
        out += _CMD_PLAY + ' [query]\n'
        out += _CMD_GENRE + ' [name]\n'
        out += _CMD_RANDOM + '\n'
        out += _CMD_PAUSE + '/' + _CMD_RESUME + '\n'
        out += _CMD_SKIP + '\n'
        out += _CMD_SHUFFLE + '\n'
        out += _CMD_FAVORITE + '\n'
        out += _CMD_UNFAVORITE + ' [name]\n'
        out += _CMD_FAVORITES + '\n'
        out += _CMD_GENRES + '\n'
        out += _CMD_QUEUE + '\n';
        out += _CMD_CLEAR + '\n';
        out += '```'
    return out;
}

async function connect(msg, mapKey) {
    try {
        let voice_Channel = await discordClient.channels.fetch(msg.member.voice.channelID);
        if (!voice_Channel) return msg.reply("Error: The voice channel does not exist!");
        let text_Channel = await discordClient.channels.fetch(msg.channel.id);
        if (!text_Channel) return msg.reply("Error: The text channel does not exist!");
        let voice_Connection = await voice_Channel.join();
        voice_Connection.play('sound.mp3', { volume: 0.5 });
        guildMap.set(mapKey, {
            'text_Channel': text_Channel,
            'voice_Channel': voice_Channel,
            'voice_Connection': voice_Connection,
            'musicQueue': [],
            'musicDispatcher': null,
            'musicYTStream': null,
            'currentPlayingTitle': null,
            'currentPlayingQuery': null,
            'debug': false,
        });
        speak_impl(voice_Connection, mapKey)
        voice_Connection.on('disconnect', async(e) => {
            if (e) console.log(e);
            guildMap.delete(mapKey);
        })
        msg.reply('connected!')
    } catch (e) {
        console.log('connect: ' + e)
        msg.reply('Error: unable to join your voice channel.');
        throw e;
    }
}

function speak_impl(voice_Connection, mapKey) {
    voice_Connection.on('speaking', async (user, speaking) => {
        if (speaking.bitfield == 0 || user.bot) {
            return
        }
        console.log(`I'm listening to ${user.username}`)
        // this creates a 16-bit signed PCM, stereo 48KHz stream
        const audioStream = voice_Connection.receiver.createStream(user, { mode: 'pcm' })
        audioStream.on('error',  (e) => { 
            console.log('audioStream: ' + e)
        });
        let buffer = [];
        audioStream.on('data', (data) => {
            buffer.push(data)
        })
        audioStream.on('end', async () => {
            buffer = Buffer.concat(buffer)
            const duration = buffer.length / 48000 / 4;
            console.log("duration: " + duration)

            if (duration < 1.0 || duration > 19) { // 20 seconds max dur
                console.log("TOO SHORT / TOO LONG; SKPPING")
                return;
            }

            try {
                let new_buffer = await convert_audio(buffer)
                let out = await transcribe(new_buffer);
                if (out != null)
                    process_commands_query(out, mapKey, user.id);
            } catch (e) {
                console.log('tmpraw rename: ' + e)
            }


        })
    })
}

function process_commands_query(query, mapKey, userid) {
    if (!query || !query.length)
        return;

    let out = null;

    const regex = /^music ([a-zA-Z]+)(.+?)?$/;
    const m = query.toLowerCase().match(regex);
    if (m && m.length) {
        const cmd = (m[1]||'').trim();
        const args = (m[2]||'').trim();

        switch(cmd) {
            case 'help':
                out = _CMD_HELP;
                break;
            case 'skip':
                out = _CMD_SKIP;
                break;
            case 'shuffle':
                out = _CMD_SHUFFLE;
                break;
            case 'genres':
                out = _CMD_GENRES;
                break;
            case 'pause':
                out = _CMD_PAUSE;
                break;
            case 'resume':
                out = _CMD_RESUME;
                break;
            case 'clear':
                if (args == 'list')
                    out = _CMD_CLEAR;
                break;
            case 'list':
                out = _CMD_QUEUE;
                break;
            case 'hello':
                out = 'hello back =)'
                break;
            case 'favorites':
                out = _CMD_FAVORITES;
                break;
            case 'set':
                switch (args) {
                    case 'favorite':
                    case 'favorites':
                        out = _CMD_FAVORITE;
                        break;
                }
                break;
            case 'play':
            case 'player':
                switch(args) {
                    case 'random':
                        out = _CMD_RANDOM;
                        break;
                    case 'favorite':
                    case 'favorites':
                        out = _CMD_PLAY + ' ' + 'favorites';
                        break;
                    default:
                        for (let k of Object.keys(GENRES)) {
                            if (GENRES[k].includes(args)) {
                                out = _CMD_GENRE + ' ' + k;
                            }
                        }
                        if (out == null) {
                            out = _CMD_PLAY + ' ' + args;
                        }
                }
                break;
        }
        if (out == null)
            out = '<bad command: ' + query + '>';
    }
    if (out != null && out.length) {
        // out = '<@' + userid + '>, ' + out;
        console.log('text_Channel out: ' + out)
        const val = guildMap.get(mapKey);
        val.text_Channel.send(out)
    }
}

async function music_message(message, mapKey) {
    let replymsgs = [];
    const messes = message.content.split('\n');
    for (let mess of messes) {
        const args = mess.split(' ');

        if (args[0] == _CMD_PLAY && args.length) {
            const qry = args.slice(1).join(' ');
            if (qry == 'favorites') {
                // play guild's favorites
                if (mapKey in GUILD_FAVORITES) {
                    let arr = GUILD_FAVORITES[mapKey];
                    if (arr.length) {
                        for (let item of arr)     {
                            addToQueue(item, mapKey)
                        }
                        message.react(EMOJI_GREEN_CIRCLE)
                    } else {
                        message.channel.send('No favorites yet.')
                    }
                } else {
                    message.channel.send('No favorites yet.')
                }
            }
            else if (isSpotify(qry)) {
                try {
                    const arr = await spotify_tracks_from_playlist(qry);
                    console.log(arr.length + ' spotify items from playlist')
                    for (let item of arr)
                        addToQueue(item, mapKey);
                    message.react(EMOJI_GREEN_CIRCLE)
                } catch(e) {
                    console.log('music_message 464:' + e)
                    message.channel.send('Failed processing spotify link: ' + qry);
                }
            } else {

                if (isYoutube(qry) && isYoutubePlaylist(qry)) {
                    try {
                        const arr = await youtube_tracks_from_playlist(qry);
                        for (let item of arr)
                            addToQueue(item, mapKey)
                        message.react(EMOJI_GREEN_CIRCLE)
                    } catch (e) {
                        console.log('music_message 476:' + e)
                        message.channel.send('Failed to process playlist: ' + qry);
                    }
                } else {
                    try {
                        addToQueue(qry, mapKey);
                        message.react(EMOJI_GREEN_CIRCLE)
                    } catch (e) {
                        console.log('music_message 484:' + e)
                        message.channel.send('Failed to find video for (try again): ' + qry);
                    }
                }
            }
        } else if (args[0] == _CMD_SKIP) {

            skipMusic(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_PAUSE) {

            pauseMusic(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_RESUME) {

            resumeMusic(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_SHUFFLE) {

            shuffleMusic(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_CLEAR) {

            clearQueue(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } else if (args[0] == _CMD_QUEUE) {

            const chunks = message_chunking(getQueueString(mapKey), DISCORD_MSG_LIMIT);
            for (let chunk of chunks) {
                console.log(chunk.length)
                message.channel.send(chunk);
            }
            message.react(EMOJI_GREEN_CIRCLE)

        } else if (args[0] == _CMD_RANDOM) {

            let arr = await spotify_new_releases();
            if (arr.length) {
                arr = shuffle(arr);
                // let item = arr[Math.floor(Math.random() * arr.length)];
                for (let item of arr)
                    addToQueue(item, mapKey);
                message.react(EMOJI_GREEN_CIRCLE)
            } else {
                message.channel.send('no results for random');
            }

        } else if (args[0] == _CMD_GENRES) {

            let out = "------------ genres ------------\n";
            for (let g of Object.keys(GENRES)) {
                out += g + '\n'
            }
            out += "--------------------------------\n";
            const chunks = message_chunking(out, DISCORD_MSG_LIMIT);
            for (let chunk of chunks)
                message.channel.send(chunk);

        } else if (args[0] == _CMD_GENRE) {

            const genre = args.slice(1).join(' ').trim();
            let arr = await spotify_recommended(genre);
            if (arr.length) {
                arr = shuffle(arr);
                // let item = arr[Math.floor(Math.random() * arr.length)];
                for (let item of arr)
                    addToQueue(item, mapKey);
                message.react(EMOJI_GREEN_CIRCLE)
            } else {
                message.channel.send('no results for genre: ' + genre);
            }

        } else if (args[0] == _CMD_FAVORITES) {
            const favs = getFavoritesString(mapKey);
            if (!(mapKey in GUILD_FAVORITES) || !GUILD_FAVORITES[mapKey].length)
                message.channel.send('No favorites to play.')
            else {
                const chunks = message_chunking(favs, DISCORD_MSG_LIMIT);
                for (let chunk of chunks)
                    message.channel.send(chunk);
                message.react(EMOJI_GREEN_CIRCLE)
            }

        } else if (args[0] == _CMD_FAVORITE) {

            setAsFavorite(mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=> {
                if (msg && msg.length) message.channel.send(msg);
            })

        }  else if (args[0] == _CMD_UNFAVORITE) {

            const qry = args.slice(1).join(' ');
            unFavorite(qry, mapKey, ()=>{
                message.react(EMOJI_GREEN_CIRCLE)
            }, (msg)=>{
                if (msg && msg.length) message.channel.send(msg);
            })

        } 

    }
    
    queueTryPlayNext(mapKey, (title)=>{
        message.react(EMOJI_GREEN_CIRCLE);
        message.channel.send('Now playing: **' + title + '**')
    }, (msg)=>{
        if (msg && msg.length) message.channel.send(msg);
    });
}

let GUILD_FAVORITES = {};
const GUILD_FAVORITES_FILE = './data/guild_favorites.json';
setInterval(()=>{
    var json = JSON.stringify(GUILD_FAVORITES);
    fs.writeFile(GUILD_FAVORITES_FILE, json, 'utf8', (err)=>{
        if (err) return console.log('GUILD_FAVORITES_FILE:' + err);
    });
},1000);
function load_guild_favorites() {
    if (fs.existsSync(GUILD_FAVORITES_FILE)) {
        const data = fs.readFileSync(GUILD_FAVORITES_FILE, 'utf8');
        GUILD_FAVORITES = JSON.parse(data);
    }
}
load_guild_favorites();

function setAsFavorite(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!val.currentPlayingTitle || !val.currentPlayingQuery)
        cberr('Nothing playing at the moment.')
    else {
        if (!(mapKey in GUILD_FAVORITES)) {
            GUILD_FAVORITES[mapKey] = [];
        }
        if (!GUILD_FAVORITES[mapKey].includes(val.currentPlayingQuery))
            GUILD_FAVORITES[mapKey].push( val.currentPlayingQuery )
        cbok()
    }
}
function unFavorite(qry, mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!qry || !qry.length)
        cberr('Invalid query.');
    else {
        if (!(mapKey in GUILD_FAVORITES)) {
            cberr('No favorites.');
        } else {
            if (GUILD_FAVORITES[mapKey].includes(qry)) {
                GUILD_FAVORITES[mapKey] = GUILD_FAVORITES[mapKey].filter(e => e !== qry); 
                cbok()
            } else {
                cberr('Favorite not found.');
            }
        }
    }
}

function getFavoritesString(mapKey) {
    let out = "------------ favorites ------------\n";
    if (mapKey in GUILD_FAVORITES) {
        let arr = GUILD_FAVORITES[mapKey];
        if (arr.length) {
            for (let item of arr)     {
                out += item + '\n';
            }
        } else {
            out += '(empty)\n'
        }
    } else {
        out += '(empty)\n'
    }
    out += "-----------------------------------\n";
    return out;
}

function message_chunking(msg, MAXL) {
    const msgs = msg.split('\n');
    const chunks = [];

    let outmsg = '';
    while (msgs.length) {
        let a = msgs.shift() + '\n';
        if (a.length > MAXL) {
            console.log(a)
            throw new Error('error#418: max single msg limit');
        }

        if ((outmsg + a + 6).length <= MAXL) {
            outmsg += a;
        } else {
            chunks.push('```' + outmsg + '```')
            outmsg = ''
        }
    }
    if (outmsg.length) {
        chunks.push('```' + outmsg + '```')
    }
    return chunks;
}

function getQueueString(mapKey) {
    let val = guildMap.get(mapKey);
    let _message = "------------ queue ------------\n";
    if (val.currentPlayingTitle != null)
        _message += '[X] ' + val.currentPlayingTitle + '\n';
    for (let i = 0; i < val.musicQueue.length; i++) {
        _message += '['+i+'] ' + val.musicQueue[i] + '\n';
    }
    if (val.currentPlayingTitle == null && val.musicQueue.length == 0)
        _message += '(empty)\n'
    _message += "---------------------------------\n";
    return _message;
}

async function queueTryPlayNext(mapKey, cbok, cberr) {
    try {
        let val = guildMap.get(mapKey);
        if (!val) {
            console.log('mapKey: ' + mapKey + ' no longer in guildMap')
            return
        }

        if (val.musicQueue.length == 0)
            return;
        if (val.currentPlayingTitle)
            return;

        const qry = val.musicQueue.shift();
        const data = await getYoutubeVideoData(qry)
        const ytid = data.id;
        const title = data.title;

        // lag or stuttering? try this first!
        // https://groovy.zendesk.com/hc/en-us/articles/360023031772-Laggy-Glitchy-Distorted-No-Audio
        val.currentPlayingTitle = title;
        val.currentPlayingQuery = qry;
        val.musicYTStream = ytdl('https://www.youtube.com/watch?v=' + ytid, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1024*1024*10, // 10mb
        }, {highWaterMark: 1})
        val.musicDispatcher = val.voice_Connection.play(val.musicYTStream);
        val.musicDispatcher.on('finish', () => {
            val.currentPlayingTitle = val.currentPlayingQuery = null;
            queueTryPlayNext(mapKey, cbok, cberr);
        });
        val.musicDispatcher.on('error', (err) => {
            if (err) console.log('musicDispatcher error: ' + err);
            console.log(err)
            cberr('Error playing <'+title+'>, try again?')
            val.currentPlayingTitle = val.currentPlayingQuery = null;
            queueTryPlayNext(mapKey, cbok, cberr);
        });
        val.musicDispatcher.on('start', () => {
            cbok(title)
        });
        
    } catch (e) {
        console.log('queueTryPlayNext: ' + e)
        cberr('Error playing, try again?')
        if (typeof val !== 'undefined') {
            val.currentPlayingTitle = val.currentPlayingQuery = null;
            if (val.musicDispatcher) val.musicDispatcher.end();
        }
    }

}

function addToQueue(title, mapKey) {
    let val = guildMap.get(mapKey);
    if (val.currentPlayingTitle == title || val.currentPlayingQuery == title || val.musicQueue.includes(title)) {
        console.log('duplicate prevented: ' + title)
    } else {
        val.musicQueue.push(title);
    }
}


function skipMusic(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!val.currentPlayingTitle) {
        cberr('Nothing to skip');
    } else {
        if (val.musicDispatcher) val.musicDispatcher.end();
        cbok()
    }
}

function pauseMusic(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!val.currentPlayingTitle) {
        cberr('Nothing to pause');
    } else {
        if (val.musicDispatcher) val.musicDispatcher.pause();
        cbok()
    }
}

function resumeMusic(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    if (!val.currentPlayingTitle) {
        cberr('Nothing to resume');
    } else {
        if (val.musicDispatcher) val.musicDispatcher.resume();
        cbok()
    }
}

function clearQueue(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    val.musicQueue = [];
    if (val.musicDispatcher) val.musicDispatcher.end();
    cbok()
}

function shuffleMusic(mapKey, cbok, cberr) {
    let val = guildMap.get(mapKey);
    val.musicQueue = shuffle(val.musicQueue);
    cbok()
}


//////////////////////////////////////////
//////////////// SPEECH //////////////////
//////////////////////////////////////////
async function transcribe(buffer) {

  return transcribe_witai(buffer)
  // return transcribe_gspeech(buffer)
}

// WitAI
let witAI_lastcallTS = null;
const witClient = require('node-witai-speech');
async function transcribe_witai(buffer) {
    try {
        // ensure we do not send more than one request per second
        if (witAI_lastcallTS != null) {
            let now = Math.floor(new Date());    
            while (now - witAI_lastcallTS < 1000) {
                console.log('sleep')
                await sleep(100);
                now = Math.floor(new Date());
            }
        }
    } catch (e) {
        console.log('transcribe_witai 837:' + e)
    }

    try {
        console.log('transcribe_witai')
        const extractSpeechIntent = util.promisify(witClient.extractSpeechIntent);
        var stream = Readable.from(buffer);
        const contenttype = "audio/raw;encoding=signed-integer;bits=16;rate=48k;endian=little"
        const outputjson = await extractSpeechIntent(WITAPIKEY, stream, contenttype)
        witAI_lastcallTS = Math.floor(new Date());
         const outputclear = outputjson.replace(/(?:\\[rn]|[\r]+)+/g, ",")
         const jsonparse = JSON.parse("["+outputclear+"]")
         const output = jsonparse[jsonparse.length - 1]
        console.log(output)
        stream.destroy()
        if (output && '_text' in output && output._text.length)
            return output._text
        if (output && 'text' in output && output.text.length)
            return output.text
        return output;
    } catch (e) { console.log('transcribe_witai 851:' + e); console.log(e) }
}

// Google Speech API
// https://cloud.google.com/docs/authentication/production
const gspeech = require('@google-cloud/speech');
const gspeechclient = new gspeech.SpeechClient({
  projectId: 'discordbot',
  keyFilename: 'gspeech_key.json'
});

async function transcribe_gspeech(buffer) {
  try {
      console.log('transcribe_gspeech')
      const bytes = buffer.toString('base64');
      const audio = {
        content: bytes,
      };
      const config = {
        encoding: 'LINEAR16',
        sampleRateHertz: 48000,
        languageCode: 'en-US',  // https://cloud.google.com/speech-to-text/docs/languages
      };
      const request = {
        audio: audio,
        config: config,
      };

      const [response] = await gspeechclient.recognize(request);
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      console.log(`gspeech: ${transcription}`);
      return transcription;

  } catch (e) { console.log('transcribe_gspeech 368:' + e) }
}

//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


//////////////////////////////////////////
//////////////// YOUTUBE /////////////////
//////////////////////////////////////////
let YT_CACHE = {};
const ytdl = require('ytdl-core');
const getYoutubeID = require('get-youtube-id');
const ytlist = require('youtube-playlist');
const yts = util.promisify(require('yt-search'))

async function searchYoutubeVideo(query) {
    const r = await yts(query);
    try {
        const videos = r.videos
        if (!videos.length) {
            console.log(query)
            throw new Error('videos empty array')
        }
        const playlists = r.playlists || r.lists
        const channels = r.channels || r.accounts
        return {id:videos[0].videoId, title:videos[0].title};
    } catch (e) {
        console.log(r)
        console.log('searchYoutubeVideo: ' + e)
        throw e;
    }
}

function isYoutube(str) {
    return str.toLowerCase().indexOf('youtube.com') > -1;
}
function isYoutubePlaylist(str) {
    return str.toLowerCase().indexOf('?list=') > -1 || str.toLowerCase().indexOf('&list=') > -1;
}

async function youtube_tracks_from_playlist(url, isretry=false) {
    const data = await ytlist(url, 'url');
    if (data && 'data' in data && 'playlist' in data.data && data.data.playlist && data.data.playlist.length) {
        return data.data.playlist
    } else {
        if (!isretry) {
            console.log('retrying yt playlist processing')
            return await youtube_tracks_from_playlist(url, true);
        } else {
            return null;
        }
    }
}

async function getYoutubeVideoData(str, isretry=false) {
    try {
        if (str in YT_CACHE) {
            const val = YT_CACHE[str];
            let now = Math.floor(new Date());
            const dt = now - val.created;
            if (dt < 1000*60*60*24*14) { // 14 days ttl
                console.log('cache hit: ' + str)
                return {id:val.id, title:val.title};
            } else {
                console.log('cache expired: ' + str)
            }
        } else {
            console.log('cache miss: ' + str)
        }

        let qry = str;
        if (isYoutube(str))
            qry = getYoutubeID(str);

        const data = await searchYoutubeVideo(qry);
        if (data && 'id' in data && 'title' in data) {
            YT_CACHE[str] = {id:data.id, title:data.title, created: Math.floor(new Date())};
        }
        return data;
    } catch (e) {
        if (!isretry) {
            console.log('2nd attempt')
            return getYoutubeVideoData(str, true);
        } else {
            console.log('getYoutubeVideoData: ' + e)
            throw new Error('unable to obtain video data');
        }
    }
}

const YT_CACHE_FILE = './data/yt_cache.json';
setInterval(()=>{
    var json = JSON.stringify(YT_CACHE);
    fs.writeFile(YT_CACHE_FILE, json, 'utf8', (err)=>{
        if (err) return console.log('YT_CACHE_FILE: ' + err);
    });
},1000);
function load_yt_cache() {
    if (fs.existsSync(YT_CACHE_FILE)) {
        const data = fs.readFileSync(YT_CACHE_FILE, 'utf8');
        YT_CACHE = JSON.parse(data);
    }
}
load_yt_cache();
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////


//////////////////////////////////////////
//////////////// SPOTIFY /////////////////
//////////////////////////////////////////
const Spotify = require('node-spotify-api');
const spotifyClient = new Spotify({
    id: SPOTIFY_TOKEN_ID,
    secret: SPOTIFY_TOKEN_SECRET
});

function isSpotify(str) {
    return str.toLowerCase().indexOf('spotify.com') > -1;
}

function spotify_extract_trackname(item) {
    if ('artists' in item) {
        let name = '';
        for (let artist of item.artists) {
            name += ' ' + artist.name;
        }

        let title = item.name;
        let track = title + ' ' + name
        return track;
    } else if ('track' in item && 'artists' in item.track) {
        return spotify_extract_trackname(item.track);
    }
}

async function spotify_new_releases() {

    let arr = await spotifyClient
        .request('https://api.spotify.com/v1/browse/new-releases')
        .then(function(data) {
            let arr = [];
            if ('albums' in data) {
                for (let item of data.albums.items) {
                    let track = spotify_extract_trackname(item)
                    arr.push(track)
                }
            }
            return arr;
        })
        .catch(function(err) {
            console.error('spotify_new_releases: ' + err);
        });

    return arr;
}

async function spotify_recommended(genre) {

    let arr = await spotifyClient
        .request('https://api.spotify.com/v1/recommendations?seed_genres=' + genre)
        .then(function(data) {
            let arr = [];
            if ('tracks' in data) {
                for (let item of data.tracks) {
                    let track = spotify_extract_trackname(item)
                    arr.push(track)
                }
            }
            return arr;
        })
        .catch(function(err) {
            console.error('spotify_recommended: ' + err);
        });

    return arr;
}

async function spotify_tracks_from_playlist(spotifyurl) {

    const regex = /\/playlist\/(.+?)(\?.+)?$/;
    const found = spotifyurl.match(regex);
    const url = 'https://api.spotify.com/v1/playlists/' + found[1] + '/tracks';
    console.log(url)
    let arr = await spotifyClient
        .request(url)
        .then(function(data) {
            let arr = [];
            if ('items' in data) {
                for (let item of data.items) {
                    let track = spotify_extract_trackname(item)
                    arr.push(track)
                }
            }
            return arr;
        })
        .catch(function(err) {
            console.error('spotify_tracks_from_playlist: ' + err);
        });

    return arr;
}
//////////////////////////////////////////
//////////////////////////////////////////
//////////////////////////////////////////
