import { Message } from '@/types/chat';

import { API_HOST } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class ServerAPIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'ServerAPIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export const OpenAIStream = async (
  systemPrompt: string,
  temperature: number,
  messages: Message[],
) => {
  let url = `${API_HOST}/api/v1/chat`;
  console.log(url);
  console.log('[utils/server/index.ts 32]', systemPrompt, temperature, messages);
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      // Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`
    },
    method: 'POST',
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: temperature,
      stream: true,
    }),
  });
  console.log(res, 'RESPONE 52 server/index.ts')
  const encoder = new TextEncoder()
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    console.log('reaching 67', res.status, res.statusText, res.body)

    const result = await res.json();
    if (result.error) {
      throw new ServerAPIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error`
      );
    };
  }

  return res;
  // const stream = new ReadableStream({
  //   async start(controller) {
  //     const onParse = (event: ParsedEvent | ReconnectInterval) => {
  //       console.log('on parse 77', event);
  //       if (event.type === 'event') {
  //         const data = event.data;
  //         console.log(data);
  //         try {
  //           const json = JSON.parse(data);
  //           if (json.data.entity === 'response_finished') {
  //             controller.close();
  //             return;
  //           }
  //           const queue = encoder.encode(JSON.stringify(json.data));
  //           controller.enqueue(queue);
  //         } catch (e) {
  //           console.log('error 69 here', e);
  //           controller.error(e);
  //         }
  //       }
  //     };

  //     const parser = createParser(onParse);

  //     for await (const chunk of res.body as any) {
  //       parser.feed(decoder.decode(chunk));
  //     }
  //   },
  // });
  // console.log(stream, 'STREAM 104 server/index.ts')
  // return stream;
};
