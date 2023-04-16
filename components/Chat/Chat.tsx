import { IconArrowDown, IconClearAll, IconSettings } from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { getEndpoint } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ChatMessage } from './ChatMessage';
import { ModelSelect } from './ModelSelect';

interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      conversations,
      models,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0) => {
      if (selectedConversation) {
        let updatedConversation: Conversation;
        if (deleteCount) {
          const updatedMessages = [...selectedConversation.messages];
          for (let i = 0; i < deleteCount; i++) {
            updatedMessages.pop();
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...updatedMessages, message],
          };
        } else {
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
          };
        }
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });
        const chatBody: ChatBody = {
          messages: updatedConversation.messages,
          prompt: updatedConversation.prompt,
          temperature: updatedConversation.temperature
        };
        const endpoint = getEndpoint();
        let body = JSON.stringify(chatBody);

        const controller = new AbortController();
        console.log('controller', controller);
        console.log('body', body);
        const response = await fetch('http://localhost:8000/api/v1/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body,
        });
        console.log(response, 'RESPONSE COMING');
        if (!response.ok) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          toast.error(response.statusText);
          return;
        }
        // const data = response.body;
        let data = await response.json();
        data = data.data;
        console.log('response gen', data)
        if (!data) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          return;
        }
        if (updatedConversation.messages.length === 1) {
          const { content } = message;
          const customName =
            content.length > 30 ? content.substring(0, 30) + '...' : content;
          updatedConversation = {
            ...updatedConversation,
            name: customName,
          };
        }
        homeDispatch({ field: 'loading', value: false });
        // const reader = data.getReader();
        // console.log('reader logtest69', reader);
        // const decoder = new TextDecoder();
        let done = false;
        let isFirst = true;
        let text = '';
        // while (!done) {
        if (stopConversationRef.current === true) {
          controller.abort();
          done = true;
        }
        // const { value, done: doneReading } = await reader.read();
        // done = doneReading;
        // let data: any = null;
        // console.log(data, 'before parsing');
        // try {
        //   console.log('PARSING DATA', value);
        //   const textDecoder = new TextDecoder();
        //   const jsonString = textDecoder.decode(value?.buffer);
        //   console.log(jsonString, 'jsonString');
        //   data = JSON.parse(decoder.decode(jsonString));

        // } catch (e) {
        //   console.log(e, 'error in data parsing')
        //   homeDispatch({ field: 'messageIsStreaming', value: false });
        //   return;
        // }
        console.log(data, 'after parsing');
        if (data.entity === 'text') {
          text += data.items[0].delta.content;
        }
        console.log(data, 'DATA HERE');
        if (isFirst) {
          isFirst = false;
          const updatedMessages: Message[] = [
            ...updatedConversation.messages,
            {
              role: 'assistant',
              content: data.entity === 'text' ? data.items[0].delta.content : '',
              type: data.entity,
              items: data.items
            },
          ];
          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages,
          };
          homeDispatch({
            field: 'selectedConversation',
            value: updatedConversation,
          });
        } else {
          const updatedMessages: Message[] =
            updatedConversation.messages.map((message, index) => {
              if (index === updatedConversation.messages.length - 1) {
                const msg = {
                  ...message,
                  content: text,
                  type: data.entity,
                  items: data.items
                };
                return msg;
              }
              return message;
            });
          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages,
          };
          homeDispatch({
            field: 'selectedConversation',
            value: updatedConversation,
          });
        }
        // }
        saveConversation(updatedConversation);
        const updatedConversations: Conversation[] = conversations.map(
          (conversation) => {
            if (conversation.id === selectedConversation.id) {
              return updatedConversation;
            }
            return conversation;
          },
        );
        if (updatedConversations.length === 0) {
          updatedConversations.push(updatedConversation);
        }
        homeDispatch({ field: 'conversations', value: updatedConversations });
        saveConversations(updatedConversations);
        homeDispatch({ field: 'messageIsStreaming', value: false });
        // else {
        //   const { answer } = await response.json();
        //   const updatedMessages: Message[] = [
        //     ...updatedConversation.messages,
        //     { role: 'assistant', content: answer },
        //   ];
        //   updatedConversation = {
        //     ...updatedConversation,
        //     messages: updatedMessages,
        //   };
        //   homeDispatch({
        //     field: 'selectedConversation',
        //     value: updateConversation,
        //   });
        //   saveConversation(updatedConversation);
        //   const updatedConversations: Conversation[] = conversations.map(
        //     (conversation) => {
        //       if (conversation.id === selectedConversation.id) {
        //         return updatedConversation;
        //       }
        //       return conversation;
        //     },
        //   );
        //   if (updatedConversations.length === 0) {
        //     updatedConversations.push(updatedConversation);
        //   }
        //   homeDispatch({ field: 'conversations', value: updatedConversations });
        //   saveConversations(updatedConversations);
        //   homeDispatch({ field: 'loading', value: false });
        //   homeDispatch({ field: 'messageIsStreaming', value: false });
        // }
      }
    },
    [
      apiKey,
      conversations,
      selectedConversation,
      stopConversationRef,
    ],
  );

  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [autoScrollEnabled]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  // useEffect(() => {
  //   console.log('currentMessage, 299 Chat.tsx', currentMessage);
  //   if (currentMessage) {
  //     handleSend(currentMessage);
  //     homeDispatch({ field: 'currentMessage', value: undefined });
  //   }
  // }, [currentMessage]);

  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }
      },
      {
        root: null,
        threshold: 0.5,
      },
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);

  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541]">
      <div
        className="max-h-full overflow-x-hidden"
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {selectedConversation?.messages.length === 0 ? (
          <div className="mx-auto flex w-[350px] flex-col space-y-10 pt-12 sm:w-[600px]">
            <div className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
              ChatSell
            </div>
          </div>
        ) : (
          <>
            {showSettings && (
              <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
              </div>
            )}

            {selectedConversation?.messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                messageIndex={index}
              />
            ))}

            {loading && <ChatLoader />}

            <div
              className="h-[162px] bg-white dark:bg-[#343541]"
              ref={messagesEndRef}
            />
          </>
        )}
      </div>

      <ChatInput
        stopConversationRef={stopConversationRef}
        textareaRef={textareaRef}
        onSend={(message) => {
          setCurrentMessage(message);
          handleSend(message, 0);
        }}
        onRegenerate={() => {
          if (currentMessage) {
            handleSend(currentMessage, 2);
          }
        }}
      />
      {showScrollDownButton && (
        <div className="absolute bottom-0 right-0 mb-4 mr-4 pb-20">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
            onClick={handleScrollDown}
          >
            <IconArrowDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
});
Chat.displayName = 'Chat';
