import { createClient } from "@/lib/supabase/server";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

type DefaultCategory = {
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
};

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Alimentação", type: "expense", color: "#F97316", icon: "🍔" },
  { name: "Moradia", type: "expense", color: "#8B5CF6", icon: "🏠" },
  { name: "Saúde", type: "expense", color: "#EF4444", icon: "🏥" },
  { name: "Transporte", type: "expense", color: "#3B82F6", icon: "🚗" },
  { name: "Educação", type: "expense", color: "#06B6D4", icon: "📚" },
  { name: "Lazer", type: "expense", color: "#EC4899", icon: "🎮" },
  { name: "Compras", type: "expense", color: "#F59E0B", icon: "🛍️" },
  { name: "Contas e Serviços", type: "expense", color: "#64748B", icon: "🧾" },
  { name: "Assinaturas", type: "expense", color: "#A855F7", icon: "📺" },
  { name: "Pets", type: "expense", color: "#84CC16", icon: "🐶" },
  { name: "Cuidados Pessoais", type: "expense", color: "#F472B6", icon: "🧴" },
  { name: "Outros", type: "expense", color: "#71717A", icon: "📦" },
  { name: "Salário", type: "income", color: "#22C55E", icon: "💼" },
  { name: "Freelance", type: "income", color: "#10B981", icon: "💻" },
  { name: "Investimentos", type: "income", color: "#14B8A6", icon: "📈" },
  { name: "Presentes", type: "income", color: "#FBBF24", icon: "🎁" },
  { name: "Outros", type: "income", color: "#6EE7B7", icon: "💰" },
];

async function seedDefaultCategories(userId: string) {
  const supabase = await createClient();

  const rows = DEFAULT_CATEGORIES.map((category) => ({
    user_id: userId,
    name: category.name,
    type: category.type,
    color: category.color,
    icon: category.icon,
  }));

  const { error } = await supabase.from("categories").insert(rows);

  if (error) throw error;
}

export async function getCategories() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  // Se o usuário ainda não tem nenhuma categoria (conta nova, ou conta
  // criada antes das categorias padrão existirem), cria o conjunto padrão
  // automaticamente na primeira vez que os dados forem buscados.
  if (!data || data.length === 0) {
    await seedDefaultCategories(user.id);

    const { data: seeded, error: seededError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (seededError) throw seededError;

    return (seeded ?? []) as Category[];
  }

  return data as Category[];
}
