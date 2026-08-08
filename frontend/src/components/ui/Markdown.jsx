import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { Link } from 'react-router-dom';

export default function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          a: ({ node, href, ...props }) => {
            if (href && href.startsWith('/u/')) {
              return <Link to={href} {...props} />;
            }
            return <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" {...props} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
