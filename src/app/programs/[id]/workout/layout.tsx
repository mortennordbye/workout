import { WorkoutSessionInitializer } from "@/components/features/WorkoutSessionInitializer";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function WorkoutLayout({ children, params }: Props) {
  const { id } = await params;
  const programId = Number(id);
  return (
    <>
      {!Number.isNaN(programId) && <WorkoutSessionInitializer programId={programId} />}
      {children}
    </>
  );
}
