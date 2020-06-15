const { MessageEmbed } = require("discord.js");
const { play } = require("../system/music");
const { YOUTUBE_API_KEY, MAX_PLAYLIST_SIZE } = require("../config.json");
const YouTubeAPI = require("simple-youtube-api");
const youtube = new YouTubeAPI(YOUTUBE_API_KEY);
const Discord = require("discord.js");
module.exports = {
  name: "playlist",
  aliases: ["pl"],
  description: "Play a playlist from youtube",
  async execute(client ,message, args) {
    const { PRUNING } = require("../config.json");
    const { channel } = message.member.voice;

    if (!args.length)
      return message
        .reply(`Usage: ${message.client.prefix}playlist <YouTube Playlist URL | Playlist Name>`)
        .catch(console.error);
    if (!channel) return message.reply("You need to join a voice channel first!").catch(console.error);

    const permissions = channel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT"))
      return message.reply("Cannot connect to voice channel, missing permissions");
    if (!permissions.has("SPEAK"))
      return message.reply("I cannot speak in this voice channel, make sure I have the proper permissions!");

    const search = args.join(" ");
    const pattern = /^.*(youtu.be\/|list=)([^#\&\?]*).*/gi;
    const url = args[0];
    const urlValid = pattern.test(args[0]);

    const serverQueue = message.client.queue.get(message.guild.id);
    const queueConstruct = {
      textChannel: message.channel,
      channel,
      connection: null,
      songs: [],
      loop: false,
      volume: 100,
      playing: true
    };

    let song = null;
    let playlist = null;
    let videos = [];

    if (urlValid) {
      try {
        playlist = await youtube.getPlaylist(url, { part: "snippet" });
        videos = await playlist.getVideos(MAX_PLAYLIST_SIZE || 10, { part: "snippet" });
      } catch (error) {
        console.error(error);
      }
    } else {
      try {
        const results = await youtube.searchPlaylists(search, 1, { part: "snippet" });
        playlist = results[0];
        videos = await playlist.getVideos(MAX_PLAYLIST_SIZE || 10, { part: "snippet" });
      } catch (error) {
        console.error(error);
      }
    }

    videos.forEach((video) => {
      song = {
        title: video.title,
        url: video.url,
        duration: video.durationSeconds
      };

      if (serverQueue) {
        serverQueue.songs.push(song);
        if (!PRUNING) {
         const sing = new Discord.MessageEmbed()
      .setDescription(`<a:Fire:718810829197279323>${song.title}  **Added To Queue** \`(${serverQueue.songs.length})\``)
    .setColor('#461a9b')
         }
      } else {
        queueConstruct.songs.push(song);
      }
    });
           let playlistEmbed = new MessageEmbed()
          .setDescription (`Loading **${playlist.title}**...`)
          .setColor('#461a9b')
           message.channel.send(playlistEmbed)
          .then(me => {
      setInterval(() => {
    let playlistEmbed = new MessageEmbed()
    .setDescription (`Loaded`)
      .setColor('#461a9b')
   me.edit(playlistEmbed)
     }, 5000);
  me.delete(3000)
    })
    if (!PRUNING) {
      playlistEmbed.setDescription(queueConstruct.songs.map((song, index) => `${index + 1} ${song.title}`));
      if (playlistEmbed.description.length >= 2048)
        playlistEmbed.description =
          playlistEmbed.description.substr(0, 2007) + "\nPlaylist larger than character limit...";
       message.channel.send(playlistEmbed)
    }
    if (!serverQueue) message.client.queue.set(message.guild.id, queueConstruct);

    if (!serverQueue) {
      try {
        const connection = await channel.join();
        queueConstruct.connection = connection;
        play(queueConstruct.songs[0], message);
      } catch (error) {
        console.error(`Could not join voice channel: ${error}`);
        message.client.queue.delete(message.guild.id);
        await channel.leave();
        return message.channel.send(`Could not join the channel: ${error}`).catch(console.error);
      }
    }
  }
};