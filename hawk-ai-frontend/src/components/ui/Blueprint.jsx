/** Hairline box with the four registration-mark corners from the design system. */
export default function Blueprint({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`blueprint ${className}`.trim()} {...rest}>
      <i className="corner tl" aria-hidden="true" />
      <i className="corner tr" aria-hidden="true" />
      <i className="corner bl" aria-hidden="true" />
      <i className="corner br" aria-hidden="true" />
      {children}
    </Tag>
  );
}
