const { Command } = require('klasa');
const { MessageEmbed } = require('discord.js');
const redis = require('redis');
const bluebird = require('bluebird');

// Init
bluebird.promisifyAll(redis.RedisClient.prototype);
const redisClient = redis.createClient();

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      runIn: ['text'],
      aliases: ['pl'],
      requiredPermissions: ['EMBED_LINKS', 'CONNECT', 'SPEAK'],
      cooldown: 5,
      description: 'Play Music (Using Lavalink)',
      usage: '<music:...string>',
      extendedHelp:
        'Play music using either:\n- URL\n- Search Term\n- Playlist URL\n\nPlease note that playlist support is currently in BETA and only first 20 songs will be played from playlist',
      quotedStringSupport: true,
    });
  }

  async run(msg, [music]) {
    const voiceChannel = msg.member.voice.channel;

    if (!voiceChannel)
      return msg.send(
        new MessageEmbed({
          title: 'Must be in a VC',
          description: 'You must be in a vc to play music',
          color: '#f44336',
        })
      );

    if (await redisClient.sismemberAsync(`mafia_games`, msg.guild.id))
      return msg.send(
        new MessageEmbed({
          title: 'Mafia being played',
          description:
            'It seems Mafia is being played currently, thus Music is unavailable',
          color: 0x2196f3,
        })
      );

    const perms = voiceChannel.permissionsFor(this.client.user);
    if (!perms.has('CONNECT') || !perms.has('SPEAK'))
      return msg.send(
        "It seems I don't have perms in Voice Channel that you're currently in"
      );

    const res = await this.client.lVoice.load(`ytsearch:${music}`);

    if (res.tracks.length < 1)
      return msg.send(
        new MessageEmbed({
          title: 'Nothing Found',
          description: 'Nothing was found matching your search terms',
          color: 0xf44336,
        })
      );

    const queue = this.client.lVoice.queues.get(msg.guild.id);
    const track = res.tracks[0];

    await queue.player.join(msg.member.voice.channel.id, { deaf: true });
    await queue.add([track.track]);

    if (queue.player.status === 0 || queue.player.status === 3) {
      // Not playing anything or Ended
      await queue.start();
      await queue.player.setVolume(msg.guild.settings.defaultVolume);
    } else if (queue.player.status === 2)
      // Paused
      await queue.pause(false);

    msg.send(
      new MessageEmbed({
        title: 'Added to queue',
        description: `**${track.info.title}** by **${track.info.author}** is added to Queue`,
        color: 0x2196f3,
      })
    );
  }
***REMOVED***
