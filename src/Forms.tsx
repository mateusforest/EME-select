import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, MessageCircle } from 'lucide-react';
import { CONTACT, whatsappUrl, type Property } from './data';
import './forms.css';

type ContactFields = { name: string; phone: string; message: string; consent: boolean };
type BookingFields = ContactFields & { date: string; period: string; time: string };
type Errors = Record<string, string>;

const contactDefaults: ContactFields = { name: '', phone: '', message: '', consent: false };

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function readableDate(value: string): string {
  if (!value) return 'A combinar com a equipe';
  if (!validDate(value)) return 'Data a revisar';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(year, month - 1, day));
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function contactErrors(values: ContactFields): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = 'Informe seu nome, com pelo menos 2 caracteres.';
  let digits = values.phone.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  if (!/^[1-9]{2}\d{8,9}$/.test(digits)) errors.phone = 'Informe um telefone brasileiro com DDD, por exemplo (54) 99990-2688.';
  if (!values.consent) errors.consent = 'Autorize o contato para continuar com o pedido.';
  return errors;
}

function focusError(form: HTMLFormElement, errors: Errors): void {
  const firstName = Object.keys(errors)[0];
  const control = form.elements.namedItem(firstName);
  if (control instanceof HTMLElement) control.focus();
}

function Field({ label, id, error, optional, children }: { label: string; id: string; error?: string; optional?: boolean; children: ReactNode }) {
  return <div className="form-field">
    <label htmlFor={id}>{label}{optional && <span className="form-optional">Opcional</span>}</label>
    {children}
    {error && <p className="form-error" id={`${id}-error`}>{error}</p>}
  </div>;
}

function Consent({ id, value, error, onChange }: { id: string; value: boolean; error?: string; onChange: (value: boolean) => void }) {
  return <div className="form-consent-block">
    <label className="form-consent" htmlFor={id}>
      <input id={id} name="consent" type="checkbox" required checked={value} onChange={event => onChange(event.target.checked)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      <span>Autorizo a EME Select a entrar em contato comigo sobre esta solicitação.</span>
    </label>
    {error && <p className="form-error" id={`${id}-error`}>{error}</p>}
    <p className="form-data-note">Seus dados ficam apenas nesta tela. Você revisa a mensagem antes de abrir o WhatsApp e confirma o envio por lá.</p>
  </div>;
}

function Review({ message, onEdit, onClose, children, booking = false }: { message: string; onEdit: () => void; onClose: () => void; children: ReactNode; booking?: boolean }) {
  return <section className="form-shell form-review" aria-label="Revisão da solicitação">
    <span className="form-eyebrow">Um passo de cada vez</span>
    <h2 tabIndex={-1} ref={node => { node?.focus(); }}>Confira seu pedido.</h2>
    <p className="form-intro">Tudo pronto para iniciar uma conversa com nossa equipe. A mensagem ainda não foi enviada.</p>
    <dl className="form-review-data">{children}</dl>
    {booking && <p className="form-notice">Horário sujeito à confirmação da equipe.</p>}
    <p className="form-contact"><MessageCircle size={17} aria-hidden="true" /> {CONTACT.brand} · {CONTACT.display}</p>
    <a className="form-primary" href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp <ArrowUpRight size={18} aria-hidden="true" /></a>
    <p className="form-external-note">Abre em uma nova aba. O envio é concluído por você no WhatsApp.</p>
    <div className="form-review-actions"><button className="form-text-button" type="button" onClick={onEdit}><ArrowLeft size={16} aria-hidden="true" />Editar informações</button><button className="form-text-button" type="button" onClick={onClose}>Fechar</button></div>
  </section>;
}

function ReviewItem({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

export function BookingForm({ property, onClose }: { property?: Property; onClose: () => void }) {
  const prefix = useId();
  const [values, setValues] = useState<BookingFields>({ ...contactDefaults, date: '', period: '', time: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [review, setReview] = useState(false);
  const update = <Key extends keyof BookingFields>(key: Key, value: BookingFields[Key]) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => { const next = { ...current }; delete next[key]; return next; });
  };
  const id = (name: string) => `${prefix}-booking-${name}`;
  const inputProps = (name: string) => ({ id: id(name), name, 'aria-invalid': Boolean(errors[name]), 'aria-describedby': errors[name] ? `${id(name)}-error` : undefined });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = contactErrors(values);
    if (values.date && (!validDate(values.date) || values.date < localDate())) next.date = 'Escolha uma data válida a partir de hoje.';
    if (values.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time)) next.time = 'Informe um horário válido.';
    if (values.time && values.period === 'Manhã' && Number(values.time.slice(0, 2)) >= 12) next.time = 'Escolha um horário antes de 12h ou altere o período.';
    if (values.time && values.period === 'Tarde' && Number(values.time.slice(0, 2)) < 12) next.time = 'Escolha um horário a partir de 12h ou altere o período.';
    if (values.date === localDate() && values.time) {
      const now = new Date();
      const [hour, minute] = values.time.split(':').map(Number);
      if (hour * 60 + minute <= now.getHours() * 60 + now.getMinutes()) next.time = 'Esse horário já passou. Sugira um horário futuro.';
    }
    setErrors(next);
    if (Object.keys(next).length) focusError(event.currentTarget, next);
    else setReview(true);
  }

  const reference = property ? `${property.title} · ${property.id}` : 'Quero conversar sobre uma visita';
  const message = [`Olá, EME Select! Gostaria de solicitar uma visita.`, `Referência: ${reference}`, `Nome: ${values.name.trim()}`, `Telefone: ${values.phone.trim()}`, `Data sugerida: ${readableDate(values.date)}`, `Período: ${values.period || 'A combinar'}`, `Horário sugerido: ${values.time || 'A combinar'}`, ...(values.message.trim() ? [`Mensagem: ${values.message.trim()}`] : []), 'Entendo que o horário e a disponibilidade precisam ser confirmados pela equipe.', 'Autorizo o contato da EME Select sobre esta solicitação.'].join('\n');

  if (review) return <Review message={message} onEdit={() => setReview(false)} onClose={onClose} booking>
    <ReviewItem label="Seu interesse">{reference}</ReviewItem>
    <ReviewItem label="Nome">{values.name.trim()}</ReviewItem>
    <ReviewItem label="Telefone">{values.phone.trim()}</ReviewItem>
    <ReviewItem label="Data sugerida">{readableDate(values.date)}</ReviewItem>
    <ReviewItem label="Preferência de horário">{[values.period, values.time].filter(Boolean).join(' · ') || 'A combinar com a equipe'}</ReviewItem>
    {values.message.trim() && <ReviewItem label="Sua mensagem">{values.message.trim()}</ReviewItem>}
  </Review>;

  return <section className="form-shell booking-shell">
    <span className="form-eyebrow">Uma visita, no seu tempo</span>
    <h2>Vamos conhecer de perto.</h2>
    <p className="form-intro">Conte quando seria melhor para você. Nossa equipe combina os detalhes com cuidado.</p>
    {property && <p className="booking-property">{property.title}<span>{property.location}</span></p>}
    <form className="form-content" noValidate onSubmit={submit}>
      <p className="form-required-note">Nome, telefone e autorização de contato são obrigatórios.</p>
      <div className="form-grid">
        <Field label="Seu nome" id={id('name')} error={errors.name}><input {...inputProps('name')} required autoComplete="name" maxLength={100} value={values.name} onChange={event => update('name', event.target.value)} /></Field>
        <Field label="Telefone com DDD" id={id('phone')} error={errors.phone}><input {...inputProps('phone')} required type="tel" inputMode="tel" autoComplete="tel" maxLength={22} value={values.phone} onChange={event => update('phone', event.target.value)} /></Field>
      </div>
      <div className="form-grid form-grid-three">
        <Field label="Data sugerida" id={id('date')} optional error={errors.date}><input {...inputProps('date')} type="date" min={localDate()} value={values.date} onChange={event => update('date', event.target.value)} /></Field>
        <Field label="Período" id={id('period')} optional><select {...inputProps('period')} value={values.period} onChange={event => update('period', event.target.value)}><option value="">A combinar</option><option>Manhã</option><option>Tarde</option></select></Field>
        <Field label="Horário" id={id('time')} optional error={errors.time}><input {...inputProps('time')} type="time" value={values.time} onChange={event => update('time', event.target.value)} /></Field>
      </div>
      <Field label="Algo que gostaria de nos contar?" id={id('message')} optional><textarea {...inputProps('message')} rows={3} maxLength={1500} value={values.message} onChange={event => update('message', event.target.value)} /></Field>
      <p className="form-notice">Horário sujeito à confirmação da equipe.</p>
      <Consent id={id('consent')} value={values.consent} error={errors.consent} onChange={value => update('consent', value)} />
      {Object.keys(errors).length > 0 && <p className="form-error-summary" role="alert">Revise os campos indicados para continuar.</p>}
      <button className="form-primary" type="submit">Revisar solicitação <ArrowUpRight size={18} aria-hidden="true" /></button>
      <button className="form-text-button form-cancel" type="button" onClick={onClose}>Agora não</button>
    </form>
  </section>;
}

export {default as OwnerForm} from './OwnerSubmission';
