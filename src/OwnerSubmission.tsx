import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, LockKeyhole } from 'lucide-react';
import { api, ApiError } from './portal/api';
import { listingTypes } from './portal/listingModel';
import './forms.css';
import './owner-submission.css';

type Fields = {
  name: string; phone: string; relationship: string; city: string; neighborhood: string;
  type: string; operation: 'comprar' | 'alugar'; environment: string; area: string; price: string;
  description: string; occupancy: string; documents: string; consent: boolean; website: string;
};
type Errors = Partial<Record<keyof Fields, string>>;
type Submission = Omit<Fields, 'area' | 'price'> & { requestId: string; area: number | null; price: number | null };

const environmentOptions = [
  ['urbano', 'Urbano'], ['litoral', 'Litoral'], ['serra', 'Serra'],
  ['comercial', 'Comercial'], ['terrenos', 'Terrenos'], ['industrial', 'Industrial'],
];
const relationships = ['Proprietário', 'Representante', 'Corretor'];
const occupancyOptions = ['Não informado', 'Desocupado', 'Ocupado pelo proprietário', 'Alugado', 'Outro / a confirmar'];
const documentOptions = ['Ainda não conferidos', 'Tenho documentos para apresentar', 'Há pendências a esclarecer'];
const stepLabels = ['O imóvel', 'Seu contato', 'Revisão'];
const initialFields: Fields = {
  name: '', phone: '', relationship: '', city: '', neighborhood: '', type: '', operation: 'comprar',
  environment: 'urbano', area: '', price: '', description: '', occupancy: occupancyOptions[0],
  documents: documentOptions[0], consent: false, website: '',
};

function Field({ label, id, error, optional, children }: { label: string; id: string; error?: string; optional?: boolean; children: ReactNode }) {
  return <div className="form-field">
    <label htmlFor={id}>{label}{optional && <span className="form-optional">Opcional</span>}</label>
    {children}
    {error && <p className="form-error" id={`${id}-error`}>{error}</p>}
  </div>;
}

function ReviewItem({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <div className={wide ? 'owner-review-wide' : undefined}><dt>{label}</dt><dd>{children}</dd></div>;
}

function validate(values: Fields, step: number): Errors {
  const errors: Errors = {};
  if (step === 0) {
    if (values.city.trim().length < 2) errors.city = 'Informe a cidade e o estado do imóvel.';
    if (!listingTypes.includes(values.type)) errors.type = 'Selecione o tipo de imóvel.';
    for (const key of ['area', 'price'] as const) {
      if (values[key] && (!Number.isFinite(Number(values[key])) || Number(values[key]) <= 0)) {
        errors[key] = key === 'area' ? 'Informe uma área maior que zero ou deixe em branco.' : 'Informe um valor maior que zero ou deixe em branco.';
      }
    }
  }
  if (step === 1) {
    if (values.name.trim().length < 2) errors.name = 'Informe seu nome, com pelo menos 2 caracteres.';
    let digits = values.phone.replace(/\D/g, '');
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
    if (!/^[1-9]{2}\d{8,9}$/.test(digits)) errors.phone = 'Informe um telefone brasileiro com DDD.';
    if (!relationships.includes(values.relationship)) errors.relationship = 'Selecione sua relação com o imóvel.';
  }
  if (step === 2 && !values.consent) errors.consent = 'Autorize o uso dos dados para enviar à avaliação.';
  return errors;
}

export default function OwnerSubmission({ onClose }: { onClose: () => void }) {
  const prefix = useId();
  const [values, setValues] = useState<Fields>(initialFields);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState('');
  const [reference, setReference] = useState('');
  const [requestId] = useState(() => crypto.randomUUID());
  const confirmedPayload = useRef<Submission | null>(null);
  const sending = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus({ preventScroll: false }); }, [step, reference]);

  const id = (key: keyof Fields) => `${prefix}-submission-${key}`;
  const control = (key: keyof Fields) => ({ id: id(key), name: key, 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${id(key)}-error` : undefined });
  const update = <K extends keyof Fields>(key: K, value: Fields[K]) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => { const next = { ...current }; delete next[key]; return next; });
  };
  function showErrors(form: HTMLFormElement, next: Errors): boolean {
    setErrors(next);
    const first = Object.keys(next)[0];
    if (!first) return false;
    const element = form.elements.namedItem(first);
    if (element instanceof HTMLElement) element.focus();
    return true;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    if (showErrors(event.currentTarget, validate(values, step))) return;
    if (step < 2) { setStep(current => current + 1); return; }
    // Keep the same payload and id after an uncertain network result to avoid duplicate requests.
    if (!confirmedPayload.current) confirmedPayload.current = {
      ...values, requestId, name: values.name.trim(), phone: values.phone.trim(), city: values.city.trim(),
      neighborhood: values.neighborhood.trim(), description: values.description.trim(),
      area: values.area ? Number(values.area) : null, price: values.price ? Number(values.price) : null,
    };
    sending.current = true;
    setBusy(true);
    setSendError('');
    try {
      const response = await api<{ reference: string }>('/public/submissions', 'POST', confirmedPayload.current);
      if (!response.reference) throw new Error('O servidor não retornou o protocolo. Tente novamente para confirmar o recebimento.');
      setReference(response.reference);
    } catch (error) {
      if (error instanceof ApiError && [400, 422].includes(error.status)) confirmedPayload.current = null;
      setSendError(error instanceof Error ? error.message : 'Não foi possível confirmar o envio. Tente novamente.');
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  if (reference) return <section className="form-shell owner-submission owner-success" aria-label="Imóvel enviado para avaliação">
    <div className="owner-success-icon"><CheckCircle2 size={30} strokeWidth={1.4} aria-hidden="true" /></div>
    <span className="form-eyebrow">Primeiro passo concluído</span>
    <h2 ref={heading} tabIndex={-1}>Recebemos seu imóvel.</h2>
    <p className="form-intro">Sua ficha foi salva para avaliação da equipe EME Select. Entraremos em contato pelo telefone informado para complementar os dados, as fotos e os documentos.</p>
    <div className="owner-protocol"><span>Seu protocolo</span><strong>{reference}</strong><small>Guarde este número para acompanhar o atendimento.</small></div>
    <p className="form-notice">O recebimento não representa aprovação na curadoria nem publicação de um anúncio.</p>
    <button className="form-primary" type="button" onClick={onClose}>Concluir <Check size={18} aria-hidden="true" /></button>
  </section>;

  return <section className="form-shell owner-submission" aria-label="Envio de imóvel para avaliação">
    <span className="form-eyebrow">Apresente seu imóvel</span>
    <ol className="owner-steps" aria-label="Etapas do envio">{stepLabels.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={index < step ? 'is-complete' : undefined}>
      <span aria-hidden="true">{index < step ? <Check size={12} /> : `0${index + 1}`}</span>{label}
    </li>)}</ol>
    <h2 ref={heading} tabIndex={-1}>{['Todo lugar tem uma história.', 'Vamos conhecer melhor.', 'Confira antes de enviar.'][step]}</h2>
    <p className="form-intro">{[
      'Comece pelo essencial. Nossa equipe vai conhecer o imóvel e avaliar sua entrada na coleção.',
      'Conte como podemos falar com você e o que já sabe sobre o imóvel.',
      'Revise sua ficha. Ao confirmar, ela será enviada à equipe e salva de forma privada no portal.',
    ][step]}</p>
    <form className="form-content" noValidate onSubmit={submit} aria-busy={busy}>
      <div className="owner-trap" aria-hidden="true"><label htmlFor={id('website')}>Website</label><input id={id('website')} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={event => update('website', event.target.value)} /></div>
      {step === 0 && <>
        <p className="form-required-note">Cidade e tipo são obrigatórios. Valores e área podem ser informados depois.</p>
        <div className="form-grid">
          <Field label="Cidade e estado" id={id('city')} error={errors.city}><input {...control('city')} required maxLength={100} placeholder="Ex.: Balneário Camboriú, SC" value={values.city} onChange={event => update('city', event.target.value)} /></Field>
          <Field label="Bairro ou região" id={id('neighborhood')} optional><input {...control('neighborhood')} maxLength={100} value={values.neighborhood} onChange={event => update('neighborhood', event.target.value)} /></Field>
          <Field label="Tipo de imóvel" id={id('type')} error={errors.type}><select {...control('type')} required value={values.type} onChange={event => update('type', event.target.value)}><option value="">Selecione</option>{listingTypes.map(type => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Ambiente" id={id('environment')}><select {...control('environment')} value={values.environment} onChange={event => update('environment', event.target.value)}>{environmentOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="O que você pretende?" id={id('operation')}><select {...control('operation')} value={values.operation} onChange={event => update('operation', event.target.value as Fields['operation'])}><option value="comprar">Vender</option><option value="alugar">Alugar</option></select></Field>
          <Field label="Área do imóvel (m²)" id={id('area')} error={errors.area} optional><input {...control('area')} type="number" inputMode="decimal" step="any" min="0.01" placeholder="Ex.: 116" value={values.area} onChange={event => update('area', event.target.value)} /></Field>
        </div>
        <Field label={values.operation === 'alugar' ? 'Aluguel mensal pretendido (R$)' : 'Preço pretendido (R$)'} id={id('price')} error={errors.price} optional><input {...control('price')} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="Somente o valor, sem separador de milhar" value={values.price} onChange={event => update('price', event.target.value)} /></Field>
      </>}
      {step === 1 && <>
        <p className="form-required-note">Nome, telefone e relação com o imóvel são obrigatórios.</p>
        <div className="form-grid">
          <Field label="Seu nome" id={id('name')} error={errors.name}><input {...control('name')} required maxLength={100} autoComplete="name" value={values.name} onChange={event => update('name', event.target.value)} /></Field>
          <Field label="Telefone com DDD" id={id('phone')} error={errors.phone}><input {...control('phone')} required type="tel" inputMode="tel" maxLength={22} autoComplete="tel" placeholder="(54) 99157-8029" value={values.phone} onChange={event => update('phone', event.target.value)} /></Field>
          <Field label="Sua relação com o imóvel" id={id('relationship')} error={errors.relationship}><select {...control('relationship')} required value={values.relationship} onChange={event => update('relationship', event.target.value)}><option value="">Selecione</option>{relationships.map(value => <option key={value}>{value}</option>)}</select></Field>
          <Field label="Ocupação atual" id={id('occupancy')} optional><select {...control('occupancy')} value={values.occupancy} onChange={event => update('occupancy', event.target.value)}>{occupancyOptions.map(value => <option key={value}>{value}</option>)}</select></Field>
        </div>
        <Field label="Documentação, conforme seu conhecimento" id={id('documents')}><select {...control('documents')} value={values.documents} onChange={event => update('documents', event.target.value)}>{documentOptions.map(value => <option key={value}>{value}</option>)}</select></Field>
        <p className="owner-field-note">Essa informação é uma declaração inicial. A conferência dos documentos será feita pela equipe.</p>
        <Field label="O que torna este imóvel especial?" id={id('description')} optional><textarea {...control('description')} rows={3} maxLength={1500} placeholder="Características, estado de conservação ou pontos que merecem atenção. Não inclua documentos pessoais aqui." value={values.description} onChange={event => update('description', event.target.value)} /></Field>
        <div className="owner-support-note"><FileCheck2 size={20} strokeWidth={1.5} aria-hidden="true" /><p>Fotos, endereço completo e documentos serão complementados com a equipe após o contato.</p></div>
      </>}
      {step === 2 && <>
        <dl className="form-review-data owner-review">
          <ReviewItem label="Imóvel">{values.type} · {values.operation === 'comprar' ? 'Venda' : 'Locação'}</ReviewItem>
          <ReviewItem label="Localização">{[values.neighborhood.trim(), values.city.trim()].filter(Boolean).join(' · ')}</ReviewItem>
          <ReviewItem label="Ambiente">{environmentOptions.find(([value]) => value === values.environment)?.[1]}</ReviewItem>
          <ReviewItem label="Área informada">{values.area ? `${Number(values.area).toLocaleString('pt-BR')} m²` : 'A informar'}</ReviewItem>
          <ReviewItem label={values.operation === 'alugar' ? 'Aluguel pretendido' : 'Preço pretendido'}>{values.price ? Number(values.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + (values.operation === 'alugar' ? ' / mês' : '') : 'A informar'}</ReviewItem>
          <ReviewItem label="Seu contato">{values.name.trim()} · {values.phone.trim()}</ReviewItem>
          <ReviewItem label="Relação com o imóvel">{values.relationship}</ReviewItem>
          <ReviewItem label="Ocupação declarada">{values.occupancy}</ReviewItem>
          <ReviewItem label="Documentação declarada">{values.documents}</ReviewItem>
          {values.description.trim() && <ReviewItem label="Sobre o imóvel" wide>{values.description.trim()}</ReviewItem>}
        </dl>
        <div className="form-consent-block">
          <label className="form-consent" htmlFor={id('consent')}><input {...control('consent')} required type="checkbox" checked={values.consent} disabled={busy || Boolean(confirmedPayload.current)} onChange={event => update('consent', event.target.checked)} /><span>Autorizo a EME Select a armazenar os dados desta ficha de forma privada, usá-los para avaliar o imóvel e entrar em contato comigo sobre esta solicitação.</span></label>
          {errors.consent && <p className="form-error" id={`${id('consent')}-error`}>{errors.consent}</p>}
        </div>
        <p className="form-notice">Enviar esta ficha não aprova o imóvel na curadoria e não publica um anúncio. As informações serão conferidas pela equipe.</p>
        <p className="owner-private-note"><LockKeyhole size={14} aria-hidden="true" />Dados de contato disponíveis apenas para a equipe autorizada.</p>
      </>}
      {Object.keys(errors).length > 0 && <p className="form-error-summary" role="alert">Revise os campos indicados para continuar.</p>}
      {sendError && <div className="form-error-summary" role="alert"><p>{sendError}</p><p>Tente novamente para confirmar o recebimento. A mesma referência será usada, sem criar outro pedido.</p></div>}
      <button className="form-primary" type="submit" disabled={busy}>{busy ? 'Enviando sua ficha…' : step < 2 ? (step === 0 ? 'Continuar' : 'Revisar ficha') : sendError ? 'Tentar envio novamente' : 'Confirmar e enviar para avaliação'}<ArrowRight size={18} aria-hidden="true" /></button>
      <div className="owner-actions">
        {step > 0 && !confirmedPayload.current ? <button className="form-text-button" type="button" onClick={() => { setErrors({}); setStep(current => current - 1); }} disabled={busy}><ArrowLeft size={15} aria-hidden="true" />{step === 2 ? 'Editar informações' : 'Voltar'}</button> : <span />}
        <button className="form-text-button" type="button" onClick={onClose} disabled={busy}>{sendError ? 'Fechar' : 'Agora não'}</button>
      </div>
    </form>
  </section>;
}
