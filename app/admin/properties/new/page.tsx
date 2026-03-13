import Link from "next/link";
import { AdminShell } from "@/app/components/admin-shell";
import { requireAdminPagePermission } from "@/lib/admin/auth";
import { PropertyForm } from "../property-form";

export const dynamic = "force-dynamic";

export default async function NewManualPropertyPage() {
  const context = await requireAdminPagePermission("properties.manage");

  return (
    <AdminShell
      title="Ajouter un bien manuel"
      description="Creation d'un bien hors passerelle SweepBright."
      role={context.role}
      profileName={context.profile?.fullName ?? context.profile?.email ?? "Mode admin"}
    >
      <div className="mb-4">
        <Link href="/admin/properties" className="text-sm underline text-[#141446]">
          Retour aux biens
        </Link>
      </div>
      <PropertyForm
        mode="create"
        source="manual"
        initial={{
          title: "",
          description: "",
          propertyType: "",
          city: "",
          postalCode: "",
          businessType: "sale",
          priceAmount: "",
          livingArea: "",
          rooms: "",
          bedrooms: "",
          floor: "",
          hasTerrace: "",
          hasElevator: "",
          coverImageUrl: "",
          isPublished: false,
        }}
      />
    </AdminShell>
  );
}
