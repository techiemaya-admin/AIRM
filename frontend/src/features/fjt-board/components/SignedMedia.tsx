import React from 'react';
import { useSignedMediaUrl } from '@/sdk/features/fjt-board';

// <img> / <a> for task-board attachments: the private media proxy needs a
// signed URL, which these fetch before the browser loads the file.
export const MediaImage: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, ...props }) => (
  <img {...props} src={useSignedMediaUrl(src)} />
);

export const MediaLink: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ href, ...props }) => (
  <a {...props} href={useSignedMediaUrl(href)} />
);
