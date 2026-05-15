export type MemberStatus = "pending" | "approved" | "rejected";
export type MemberType = "retail" | "member" | "reseller";

export interface Member {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  pin: string;
  type: MemberType;
  status: MemberStatus;
  balance: number;
  createdAt: string;
  approvedAt?: string;
  notes?: string;
}

const MEMBERS_KEY = "roneycell_members";
const SESSION_KEY = "roneycell_member_session";

export function loadMembers(): Member[] {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveMembers(members: Member[]): void {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
}

export function getMemberById(id: string): Member | null {
  return loadMembers().find((m) => m.id === id) ?? null;
}

export function getMemberByPhone(phone: string): Member | null {
  const clean = phone.replace(/\D/g, "");
  return loadMembers().find((m) => m.phone.replace(/\D/g, "") === clean) ?? null;
}

export function addMember(data: Omit<Member, "id" | "createdAt">): Member {
  const member: Member = {
    ...data,
    id: `M${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  const list = loadMembers();
  list.push(member);
  saveMembers(list);
  return member;
}

export function updateMember(id: string, changes: Partial<Member>): void {
  const list = loadMembers().map((m) => (m.id === id ? { ...m, ...changes } : m));
  saveMembers(list);
}

export function deleteMember(id: string): void {
  saveMembers(loadMembers().filter((m) => m.id !== id));
}

export function approveMember(id: string): void {
  updateMember(id, { status: "approved", approvedAt: new Date().toISOString() });
}

export function rejectMember(id: string): void {
  updateMember(id, { status: "rejected" });
}

export function transferBalance(memberId: string, amount: number): boolean {
  const member = getMemberById(memberId);
  if (!member) return false;
  updateMember(memberId, { balance: (member.balance ?? 0) + amount });
  return true;
}

export function deductMemberBalance(memberId: string, amount: number): boolean {
  const member = getMemberById(memberId);
  if (!member) return false;
  if ((member.balance ?? 0) < amount) return false;
  updateMember(memberId, { balance: member.balance - amount });
  return true;
}

export function registerMember(data: {
  name: string;
  phone: string;
  whatsapp: string;
  pin: string;
}): { success: boolean; message: string; member?: Member } {
  const exists = getMemberByPhone(data.phone);
  if (exists) return { success: false, message: "Nombor telefon sudah berdaftar." };

  const member = addMember({
    ...data,
    type: "member",
    status: "pending",
    balance: 0,
  });
  return { success: true, message: "Pendaftaran berjaya! Sila tunggu kelulusan admin.", member };
}

export function loginMember(phone: string, pin: string): { success: boolean; message: string; member?: Member } {
  const member = getMemberByPhone(phone);
  if (!member) return { success: false, message: "Nombor telefon tidak dijumpai." };
  if (member.pin !== pin) return { success: false, message: "PIN salah." };
  if (member.status === "pending") return { success: false, message: "Akaun anda sedang menunggu kelulusan admin." };
  if (member.status === "rejected") return { success: false, message: "Akaun anda telah ditolak. Hubungi admin." };
  saveSession(member.id);
  return { success: true, message: "Log masuk berjaya!", member };
}

export function saveSession(memberId: string): void {
  localStorage.setItem(SESSION_KEY, memberId);
}

export function loadSession(): Member | null {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  return getMemberById(id);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export const TYPE_LABELS: Record<MemberType, string> = {
  retail: "Retail",
  member: "Member",
  reseller: "Reseller",
};

export const TYPE_COLORS: Record<MemberType, string> = {
  retail: "#6B7280",
  member: "#3B82F6",
  reseller: "#F59E0B",
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  pending: "Menunggu",
  approved: "Diluluskan",
  rejected: "Ditolak",
};

export const STATUS_COLORS: Record<MemberStatus, string> = {
  pending: "#FBBF24",
  approved: "#34D399",
  rejected: "#F87171",
};
