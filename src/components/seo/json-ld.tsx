/**
 * Renders a structured-data block.
 *
 * The JSON is serialised with `<` escaped. Every value in here is text an
 * administrator typed — a product name, a company description — and an
 * unescaped `</script>` inside one of them would end the block early and turn
 * the rest into markup.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // The string is ours and escaped above; React would otherwise encode the
      // quotes and browsers would not parse it.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
