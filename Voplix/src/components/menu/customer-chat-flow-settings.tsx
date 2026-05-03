'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { formatCurrencyAmount, type ShopCurrency } from '@/lib/currency';
import { applyBracketPlaceholders, escapeHtml, mergeBotTelegramCopy } from '@/lib/bot-telegram-copy';
import { sanitizeOwnerHtml } from '@/lib/sanitize-html';
import { cn } from '@/lib/utils';

export type CustomerMsgTemplatesState = {
  product_selected_message_html: string;
  payment_instruction_intro_html: string;
  slip_request_html: string;
  slip_submitted_thanks_html: string;
  bot_paused_message_html: string;
};

const SAMPLE = {
  ProductName: 'Sample product',
  PriceKey: 12500 as number,
  ShopName: 'Your shop name',
  CustomerName: '@buyer',
};

type MsgFieldKey = keyof CustomerMsgTemplatesState;

const INSERTS: { label: string; token: string; fields: MsgFieldKey[] }[] = [
  { label: 'Item name', token: '[ProductName]', fields: ['product_selected_message_html', 'payment_instruction_intro_html', 'slip_submitted_thanks_html'] },
  { label: 'Price', token: '[Price]', fields: ['product_selected_message_html', 'payment_instruction_intro_html'] },
  { label: 'Shop name', token: '[ShopName]', fields: ['payment_instruction_intro_html', 'slip_submitted_thanks_html', 'bot_paused_message_html'] },
  { label: 'Buyer name', token: '[CustomerName]', fields: ['slip_submitted_thanks_html'] },
];

function isPlainCopy(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function samplesForPreview(currency: ShopCurrency): Record<string, string> {
  return {
    ProductName: SAMPLE.ProductName,
    Price: formatCurrencyAmount(SAMPLE.PriceKey, currency),
    ShopName: SAMPLE.ShopName,
    CustomerName: SAMPLE.CustomerName,
  };
}

function htmlBubbleFromTemplate(template: string, samples: Record<string, string>): string {
  const escaped = Object.fromEntries(
    Object.entries(samples).map(([k, v]) => [k, escapeHtml(v)])
  ) as Record<string, string>;
  const raw = applyBracketPlaceholders(template, escaped);
  return sanitizeOwnerHtml(raw);
}

function PlainPaymentPreview(text: string): string {
  const t = text.trim();
  if (!t) return '';
  const esc = escapeHtml(t).replace(/\n/g, '<br/>');
  return sanitizeOwnerHtml(esc);
}

function TelegramChatChrome({
  botUsername,
  children,
}: {
  botUsername: string;
  children: React.ReactNode;
}) {
  const u = botUsername.replace(/^@/, '');
  const initial = (u[0] || '?').toUpperCase();
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-100/90 p-3 dark:border-zinc-700 dark:bg-zinc-950/50">
      <div className="mb-3 flex items-center gap-2 border-b border-zinc-200/80 pb-2 dark:border-zinc-700/80">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-300 text-xs font-bold text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">@{u}</p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">How it looks in Telegram (sample names &amp; price)</p>
        </div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function BotBubble({ html, plainFallback }: { html: string; plainFallback?: string }) {
  const safe = html.trim() ? html : plainFallback ? sanitizeOwnerHtml(`<span>${escapeHtml(plainFallback)}</span>`) : '';
  return (
    <div className="flex justify-start">
      <div className="max-w-[96%] rounded-2xl rounded-bl-md border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-600 dark:bg-zinc-800">
        {safe ? (
          <div
            className="prose prose-sm max-w-none text-sm leading-relaxed text-zinc-900 prose-p:my-1 dark:prose-invert dark:text-zinc-100 prose-strong:text-zinc-900 dark:prose-strong:text-white"
            dangerouslySetInnerHTML={{ __html: safe }}
          />
        ) : (
          <p className="text-xs italic text-zinc-500">Empty message</p>
        )}
        <p className="mt-1 text-right text-[10px] text-zinc-400 tabular-nums dark:text-zinc-500">12:34</p>
      </div>
    </div>
  );
}

function InlineKeyboardMock({ confirmLabel, cancelLabel }: { confirmLabel: string; cancelLabel: string }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1 pl-1">
      <span className="rounded-md border border-zinc-300 bg-zinc-200/90 px-3 py-1.5 text-xs font-medium text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100">
        {confirmLabel}
      </span>
      <span className="rounded-md border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200">
        {cancelLabel}
      </span>
    </div>
  );
}

function StepHeader({ n, title, subtitle }: { n: number; title: string; subtitle: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
        {n}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">{title}</h4>
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}

function InsertChips({
  field,
  canEdit,
  onInsert,
}: {
  field: MsgFieldKey;
  canEdit: boolean;
  onInsert: (token: string) => void;
}) {
  const chips = INSERTS.filter((c) => c.fields.includes(field));
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-zinc-500 dark:text-zinc-500">Add:</span>
      {chips.map((c) => (
        <Button
          key={c.token}
          type="button"
          variant="outline"
          size="sm"
          disabled={!canEdit}
          className="h-7 border-zinc-300 bg-white px-2 text-xs font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          onClick={() => onInsert(c.token)}
        >
          {c.label}
        </Button>
      ))}
    </div>
  );
}

export function CustomerChatFlowSettings({
  botUsername,
  telegramCustomerCopy,
  msgTemplates,
  setMsgTemplates,
  paymentInstructions,
  setPaymentInstructions,
  canEdit,
  currency,
}: {
  botUsername: string;
  telegramCustomerCopy: unknown;
  msgTemplates: CustomerMsgTemplatesState;
  setMsgTemplates: React.Dispatch<React.SetStateAction<CustomerMsgTemplatesState>>;
  paymentInstructions: string;
  setPaymentInstructions: (v: string) => void;
  canEdit: boolean;
  currency: ShopCurrency;
}) {
  const mergedPreview = useMemo(() => {
    const base = isPlainCopy(telegramCustomerCopy) ? { ...telegramCustomerCopy } : {};
    return mergeBotTelegramCopy({ ...base, ...msgTemplates });
  }, [telegramCustomerCopy, msgTemplates]);

  const samples = useMemo(() => samplesForPreview(currency), [currency]);

  const insertInto = (field: MsgFieldKey, token: string) => {
    if (!canEdit) return;
    setMsgTemplates((prev) => ({
      ...prev,
      [field]: prev[field] + token,
    }));
  };

  const introHtml = htmlBubbleFromTemplate(msgTemplates.payment_instruction_intro_html, samples);
  const paymentPlain = paymentInstructions.trim();
  const slipAskHtml = sanitizeOwnerHtml(mergedPreview.slip_request_html);

  return (
    <div className="space-y-8 py-2 max-h-[72vh] overflow-y-auto pr-1">
      <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Follow the numbers — each block matches what the buyer sees in Telegram, in order. The gray tags under a box
        add a piece of auto-filled text (sample item, price, shop, buyer) so you do not have to type those yourself.
      </p>

      {!canEdit ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">Editing these steps needs Pro or Plus.</p>
          <p className="mt-1 text-xs leading-relaxed">On Free, buyers always see our default wording. You can still set payment numbers at the bottom.</p>
          <Link href="/subscription" className="mt-2 inline-block text-xs font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-100">
            See plans
          </Link>
        </div>
      ) : null}

      {/* Step 1 */}
      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <StepHeader
          n={1}
          title="They tap something on your menu"
          subtitle="One chat bubble, then two buttons under it (same as Telegram)."
        />
        <TelegramChatChrome botUsername={botUsername}>
          <BotBubble html={htmlBubbleFromTemplate(msgTemplates.product_selected_message_html, samples)} />
          <InlineKeyboardMock
            confirmLabel={mergedPreview.button_confirm_pay}
            cancelLabel={mergedPreview.button_cancel}
          />
        </TelegramChatChrome>
        <Label className="text-zinc-800 dark:text-zinc-200">Change this bubble</Label>
        <InsertChips field="product_selected_message_html" canEdit={canEdit} onInsert={(t) => insertInto('product_selected_message_html', t)} />
        <Textarea
          value={msgTemplates.product_selected_message_html}
          onChange={(e) => setMsgTemplates((p) => ({ ...p, product_selected_message_html: e.target.value }))}
          readOnly={!canEdit}
          maxLength={4096}
          rows={5}
          className={cn(
            'min-h-[110px] border-zinc-300 bg-zinc-50 text-sm dark:border-zinc-700 dark:bg-zinc-950',
            !canEdit && 'cursor-not-allowed opacity-90'
          )}
        />
        <p className="text-[11px] text-zinc-500">{msgTemplates.product_selected_message_html.length} characters</p>
      </section>

      {/* Step 2 — matches webhook: intro HTML, then plain payment chunks, then slip_request HTML */}
      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <StepHeader
          n={2}
          title="They tap Confirm & pay"
          subtitle="Telegram sends three things in a row: your short line, your account numbers, then a line asking for the slip photo."
        />
        <TelegramChatChrome botUsername={botUsername}>
          <BotBubble html={introHtml} />
          <p className="pl-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">then</p>
          {paymentPlain ? (
            <BotBubble html={PlainPaymentPreview(paymentPlain)} />
          ) : (
            <div className="flex justify-start">
              <div className="max-w-[96%] rounded-2xl rounded-bl-md border border-dashed border-amber-300/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100">
                Your KBZ / bank / wallet lines are empty — fill the big box at the bottom of this window so buyers see
                them here.
              </div>
            </div>
          )}
          <p className="pl-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">then</p>
          <BotBubble html={slipAskHtml} />
        </TelegramChatChrome>
        <Label className="text-zinc-800 dark:text-zinc-200">First bubble — short line before account numbers</Label>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-500">
          The middle bubble is the big &quot;Account numbers and how to pay&quot; box at the bottom of this page.
        </p>
        <InsertChips field="payment_instruction_intro_html" canEdit={canEdit} onInsert={(t) => insertInto('payment_instruction_intro_html', t)} />
        <Textarea
          value={msgTemplates.payment_instruction_intro_html}
          onChange={(e) => setMsgTemplates((p) => ({ ...p, payment_instruction_intro_html: e.target.value }))}
          readOnly={!canEdit}
          maxLength={4096}
          rows={4}
          className={cn(
            'min-h-[100px] border-zinc-300 bg-zinc-50 text-sm dark:border-zinc-700 dark:bg-zinc-950',
            !canEdit && 'cursor-not-allowed opacity-90'
          )}
        />
        <p className="text-[11px] text-zinc-500">{msgTemplates.payment_instruction_intro_html.length} characters</p>

        <Label className="pt-2 text-zinc-800 dark:text-zinc-200">Last bubble in this group — ask for their slip photo</Label>
        <Textarea
          value={msgTemplates.slip_request_html}
          onChange={(e) => setMsgTemplates((p) => ({ ...p, slip_request_html: e.target.value }))}
          readOnly={!canEdit}
          maxLength={4096}
          rows={3}
          className={cn(
            'min-h-[88px] border-zinc-300 bg-zinc-50 text-sm dark:border-zinc-700 dark:bg-zinc-950',
            !canEdit && 'cursor-not-allowed opacity-90'
          )}
        />
        <p className="text-[11px] text-zinc-500">{msgTemplates.slip_request_html.length} characters</p>
      </section>

      {/* Step 3 */}
      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <StepHeader
          n={3}
          title="They send the payment photo"
          subtitle="Right after their slip is saved, they see this thank-you line."
        />
        <TelegramChatChrome botUsername={botUsername}>
          <BotBubble html={htmlBubbleFromTemplate(msgTemplates.slip_submitted_thanks_html, samples)} />
        </TelegramChatChrome>
        <Label className="text-zinc-800 dark:text-zinc-200">Change this bubble</Label>
        <InsertChips field="slip_submitted_thanks_html" canEdit={canEdit} onInsert={(t) => insertInto('slip_submitted_thanks_html', t)} />
        <Textarea
          value={msgTemplates.slip_submitted_thanks_html}
          onChange={(e) => setMsgTemplates((p) => ({ ...p, slip_submitted_thanks_html: e.target.value }))}
          readOnly={!canEdit}
          maxLength={4096}
          rows={4}
          className={cn(
            'min-h-[100px] border-zinc-300 bg-zinc-50 text-sm dark:border-zinc-700 dark:bg-zinc-950',
            !canEdit && 'cursor-not-allowed opacity-90'
          )}
        />
        <p className="text-[11px] text-zinc-500">{msgTemplates.slip_submitted_thanks_html.length} characters</p>
      </section>

      {/* Step 4 */}
      <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <StepHeader
          n={4}
          title="Your shop is turned off"
          subtitle="If you pause the shop, anyone who writes in or taps an old button only sees this."
        />
        <TelegramChatChrome botUsername={botUsername}>
          <BotBubble html={htmlBubbleFromTemplate(msgTemplates.bot_paused_message_html, samples)} />
        </TelegramChatChrome>
        <Label className="text-zinc-800 dark:text-zinc-200">Change this bubble</Label>
        <InsertChips field="bot_paused_message_html" canEdit={canEdit} onInsert={(t) => insertInto('bot_paused_message_html', t)} />
        <Textarea
          value={msgTemplates.bot_paused_message_html}
          onChange={(e) => setMsgTemplates((p) => ({ ...p, bot_paused_message_html: e.target.value }))}
          readOnly={!canEdit}
          maxLength={4096}
          rows={3}
          className={cn(
            'min-h-[88px] border-zinc-300 bg-zinc-50 text-sm dark:border-zinc-700 dark:bg-zinc-950',
            !canEdit && 'cursor-not-allowed opacity-90'
          )}
        />
        <p className="text-[11px] text-zinc-500">{msgTemplates.bot_paused_message_html.length} characters</p>
      </section>

      {/* Payment details — step 5 in practice */}
      <section className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
        <StepHeader
          n={5}
          title="Account numbers and how to pay"
          subtitle="This is the middle bubble in step 2. Plain writing is best — phone numbers, account names, Wave, KBZ, etc."
        />
        <Textarea
          value={paymentInstructions}
          onChange={(e) => setPaymentInstructions(e.target.value)}
          placeholder="Example:&#10;KBZ Pay — 09xxxxxxxxx (Your shop)&#10;AYA Bank — 1234567890"
          maxLength={12000}
          rows={8}
          className="min-h-[160px] border-zinc-300 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <p className="text-[11px] text-zinc-500">{paymentInstructions.length} characters</p>
      </section>

    </div>
  );
}
