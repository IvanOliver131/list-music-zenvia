const dotenv = require('dotenv');
const got = require('got');
const FormData = require('form-data');
const { Client, FileContent, TextContent, WebhookController } = require('@zenvia/sdk');

dotenv.config();

const client = new Client(process.env.ZENVIA_TOKEN);

const whatsapp = client.getChannel('whatsapp');


const webhook = new WebhookController({ 
  messageEventHandler: async (messageEvent) => {
    let content = [new TextContent('Testado')];

    if (messageEvent.message.contents[0].type === 'file' && messageEvent.message.contents[0].fileMimeType.includes('audio')) {
      const music = await recognizeMusic(messageEvent.message.contents[0].fileUrl);

      if (music) {
        let text = '';
        if (music.artist) {
          text = `${text}Artista: *${music.artist}*\n`;
        }
        if (music.title) {
          text = `${text}Título: *${music.title}*\n`;
        }
        if (music.album) {
          text = `${text}Álbum: *${music.album}*\n`;
        }
        content = [new TextContent(text)];
        if (music.deezer && music.deezer.picture) {
          content.push(new FileContent(music.deezer.picture, 'image/jpeg'));
        }
        if (music.deezer && music.deezer.preview) {
          content.push(new FileContent(music.deezer.preview, 'audio/mpeg'));
        }
      } else {
        content = [new TextContent('Não foi possível identificar a música do áudio.')];
      }
    }

    whatsapp.sendMessage(messageEvent.message.to, messageEvent.message.from, ...content)
    .then((response) => {
      console.debug('Response:', response);
    });
  },
});

webhook.on('listening', () => {
  console.info('Webhook is listening');
});

webhook.init();

const recognizeMusic = async (url) => {
  const form = new FormData();
  form.append('api_token', process.env.AUDD_TOKEN);
  form.append('url', url);
  form.append('return', 'deezer');

  const response = await got.post('https://api.audd.io/', {
    body: form,
    responseType: 'json',
    resolveBodyOnly: true,
  });

  const data = JSON.parse(response.body);

  if (data && data.result) {
    return {
      artist: data.result.artist,
      title: data.result.title,
      album: data.result.album,
      deezer: {
        picture: data.result.deezer && data.result.deezer.artist ? data.result.deezer.artist.picture_medium : undefined,
        preview: data.result.deezer ? data.result.deezer.preview : undefined,
      },
    };
  }
};
