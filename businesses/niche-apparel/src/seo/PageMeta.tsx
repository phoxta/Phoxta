type Props = {
  title: string;
  description?: string;
};

export default function PageMeta({ title, description }: Props) {
  return (
    <>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
    </>
  );
}
