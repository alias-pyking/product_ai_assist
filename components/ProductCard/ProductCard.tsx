import { FC } from 'react';

interface Props {
    name: string;
    image: string;
    color: string;
    usage: string;
}

const BasicExample: FC<Props> = ({name, image, color, usage}) => {
  return (
    <div className='flex-none w-72 p-2 bg-gray shadow-lg rounded-lg mr-2 items-center justify-center'>
    <img src={image} alt="Product Image" className="rounded-lg mb-2 fluid"/>
    <h3 className="text-lg font-medium mb-2">{name}</h3>
    <p className="text-gray-400 mb-2">${color}</p>
    <p className="text-gray-300">{usage}</p>
    </div>
  );
}

export default BasicExample;