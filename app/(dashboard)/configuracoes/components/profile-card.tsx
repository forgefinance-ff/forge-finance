import { createClient } from "@/lib/supabase/server";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { UpdateProfileForm } from "./update-profile-form";

export async function ProfileCard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const name =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Minha Conta</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-slate-400">E-mail</p>
          <p className="font-medium">{user?.email}</p>
        </div>

        <UpdateProfileForm initialName={name} />

        <div>
          <p className="text-sm text-slate-400">ID da Conta</p>
          <p className="break-all text-xs text-slate-400">
            {user?.id}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}