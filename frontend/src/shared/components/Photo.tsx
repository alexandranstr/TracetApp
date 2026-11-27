import React from 'react';
import { Image, ImageProps } from 'expo-image';

type PhotoProps = Omit<ImageProps, 'source'> & { uri: string };

export default function Photo({ uri, contentFit = 'cover', ...props }: PhotoProps) {
    return (
        <Image
            source={uri}
            contentFit={contentFit}
            cachePolicy="memory-disk"
            transition={150}
            recyclingKey={uri}
            {...props}
        />
    );
}
