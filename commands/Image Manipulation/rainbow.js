const { Command } = require('klasa');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      runIn: ['text', 'group'],
      aliases: ['gay', 'homo', 'lgbt'],
      requiredPermissions: ['EMBED_LINKS'],
      cooldown: 10,
      description: "Draw a rainbow over an image or a user's Avatar",
      usage: '<image:image>',
    });
  }

  async run(msg, [image]) {
    try {
      const base = await loadImage(
        path.join(__dirname, '..', '..', 'images', 'rainbow.png')
      );
      const data = await loadImage(image);
      const canvas = createCanvas(data.width, data.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(data, 0, 0);
      ctx.drawImage(base, 0, 0, data.width, data.height);
      const attachment = canvas.toBuffer();
      if (Buffer.byteLength(attachment) > 8e6)
        return msg.reply('Resulting image was above 8 MB.');
      return msg.send({ files: [{ attachment, name: 'rainbow.png' }] });
    } catch (err) {
      return msg.reply(
        `Oh no, an error occurred: \`${err.message}\`. Try again later!`
      );
    }
  }
***REMOVED***
