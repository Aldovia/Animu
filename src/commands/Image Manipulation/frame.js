const { Command } = require('klasa');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

module.exports = class extends Command {
  constructor(...args) {
    super(...args, {
      runIn: ['text'],
      cooldown: 10,
      description: "Draw a frame over an image or a user's avatar",
      usage: '<image:image>',
    });
  }

  async run(msg, [image]) {
    try {
      const base = await loadImage(
        path.join(__dirname, '..', '..', '..', 'assets', 'images', 'frame.png')
      );
      const data = await loadImage(image);
      const canvas = createCanvas(data.width, data.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(data, 0, 0);
      ctx.drawImage(base, 0, 0, data.width, data.height);
      const attachment = canvas.toBuffer();
      if (Buffer.byteLength(attachment) > 8e6)
        return msg.reply('Resulting image was above 8 MB.');
      return msg.send({ files: [{ attachment, name: 'frame.png' }] });
    } catch (err) {
      return msg.reply(
        `Oh no, an error occurred: \`${err.message}\`. Try again later!`
      );
    }
  }
};
