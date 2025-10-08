-- Drop the overly permissive policy that allows all authenticated users to see all students
DROP POLICY IF EXISTS "Everyone can view students" ON public.students;

-- Admins and coordinators can view all students (they need this for management)
CREATE POLICY "Admins and coordinators can view all students"
ON public.students
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'coordinator')
  )
);

-- Advisers can view students in sections they advise
CREATE POLICY "Advisers can view their section students"
ON public.students
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    INNER JOIN public.sections ON sections.adviser_id = profiles.id
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'adviser'
      AND sections.id = students.section_id
  )
);

-- Beadles can view students in sections where they have submitted attendance
CREATE POLICY "Beadles can view students in their assigned sections"
ON public.students
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    INNER JOIN public.attendance ON attendance.submitted_by = profiles.id
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'beadle'
      AND attendance.section_id = students.section_id
  )
);