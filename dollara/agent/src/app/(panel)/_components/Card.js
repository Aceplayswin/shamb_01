/** The panel's one container. Every screen is built out of these. */
export default function Card({ title, actions, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
          {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={`px-5 pb-5 ${title || actions ? '' : 'pt-5'} ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
}
