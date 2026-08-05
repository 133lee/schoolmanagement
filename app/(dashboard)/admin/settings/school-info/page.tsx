"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, Building2, Trash2, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import Image from "next/image";

/**
 * School Information Settings Page
 * Configure school details, contact information, and branding
 */

interface SchoolInfo {
  name: string;
  motto: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  smsPhone: string;
  principalName: string;
  foundedYear: string;
  studentCapacity: string;
  schoolType: string;
  registrationNumber: string;
}

export default function SchoolInfoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<SchoolInfo>({
    name: "",
    motto: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    phone: "",
    email: "",
    website: "",
    smsPhone: "",
    principalName: "",
    foundedYear: "",
    studentCapacity: "",
    schoolType: "Secondary",
    registrationNumber: "",
  });

  useEffect(() => {
    loadSchoolInfo();
  }, []);

  const loadSchoolInfo = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/settings/school-info", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load school information");
      }

      const data = await response.json();
      if (data.settings) {
        setFormData(data.settings);
        // Set logo URL if exists
        const logoFilename = data.settings.logoFilename || "school-logo.png";
        setLogoUrl(`/${logoFilename}?t=${Date.now()}`);
      }
    } catch (error) {
      console.error("Failed to load school information:", error);
      toast.error("Failed to load school information");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SchoolInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate required fields
      if (!formData.name) {
        toast.error("School name is required");
        return;
      }
      if (!formData.email) {
        toast.error("School email is required");
        return;
      }

      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/settings/school-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save school information");
      }

      toast.success("School information saved successfully");
    } catch (error: any) {
      console.error("Failed to save school information:", error);
      toast.error(error.message || "Failed to save school information");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Only PNG, JPG, and SVG are allowed.");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setUploadingLogo(true);
    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("logo", file);

      const response = await fetch("/api/admin/settings/school-info/logo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload logo");
      }

      const data = await response.json();
      setLogoUrl(`${data.url}?t=${Date.now()}`);
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      console.error("Failed to upload logo:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogoDelete = async () => {
    if (!confirm("Are you sure you want to delete the school logo?")) {
      return;
    }

    setUploadingLogo(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/settings/school-info/logo", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete logo");
      }

      setLogoUrl(`/school-logo.png?t=${Date.now()}`);
      toast.success("Logo deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete logo:", error);
      toast.error(error.message || "Failed to delete logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3"><Skeleton className="h-9 w-20" /><Skeleton className="h-7 w-48" /></div>
        <Card><CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent></Card>
        <Card><CardContent className="pt-6 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-32 w-full" />
        </CardContent></Card>
        <Skeleton className="h-9 w-24" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mt-1">
        <Link href="/admin/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Settings
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h1 className="text-xl font-bold">School Information</h1>
            <p className="text-sm text-muted-foreground">
              Configure school details and contact information
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Primary school details and identification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Kambombo Day Secondary School"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registration Number</Label>
              <Input
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) => handleChange("registrationNumber", e.target.value)}
                placeholder="e.g., REG/2024/001"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="motto">School Motto</Label>
              <Input
                id="motto"
                value={formData.motto}
                onChange={(e) => handleChange("motto", e.target.value)}
                placeholder="e.g., Excellence Through Education"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolType">School Type</Label>
              <select
                id="schoolType"
                value={formData.schoolType}
                onChange={(e) => handleChange("schoolType", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="Primary">Primary</option>
                <option value="Secondary">Secondary</option>
                <option value="Combined">Combined (Primary & Secondary)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foundedYear">Founded Year</Label>
              <Input
                id="foundedYear"
                type="number"
                value={formData.foundedYear}
                onChange={(e) => handleChange("foundedYear", e.target.value)}
                placeholder="e.g., 2005"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentCapacity">Student Capacity</Label>
              <Input
                id="studentCapacity"
                type="number"
                value={formData.studentCapacity}
                onChange={(e) => handleChange("studentCapacity", e.target.value)}
                placeholder="e.g., 500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="principalName">Principal/Head Teacher Name</Label>
              <Input
                id="principalName"
                value={formData.principalName}
                onChange={(e) => handleChange("principalName", e.target.value)}
                placeholder="e.g., Dr. John Banda"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            How to reach the school - displayed on reports and communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Physical Address *</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="e.g., Plot 123, Independence Avenue"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City/Town *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                placeholder="e.g., Lusaka"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <select
                id="province"
                value={formData.province}
                onChange={(e) => handleChange("province", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select Province</option>
                <option value="Central">Central</option>
                <option value="Copperbelt">Copperbelt</option>
                <option value="Eastern">Eastern</option>
                <option value="Luapula">Luapula</option>
                <option value="Lusaka">Lusaka</option>
                <option value="Muchinga">Muchinga</option>
                <option value="Northern">Northern</option>
                <option value="North-Western">North-Western</option>
                <option value="Southern">Southern</option>
                <option value="Western">Western</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                placeholder="e.g., 10101"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="e.g., +260 211 123456"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="e.g., info@kambomboschool.edu.zm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (Optional)</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="e.g., https://www.kambomboschool.edu.zm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            School logo displayed on report cards and documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Logo Preview */}
            {logoUrl && (
              <div className="flex justify-center">
                <div className="relative w-40 h-40 border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
                  <Image
                    src={logoUrl}
                    alt="School Logo"
                    fill
                    className="object-contain p-2"
                    unoptimized
                  />
                </div>
              </div>
            )}

            {/* Upload Section */}
            <div className="border-2 border-dashed rounded-lg p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="flex flex-col items-center gap-4">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">
                    {logoUrl ? "Change School Logo" : "Upload School Logo"}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    PNG, JPG, or SVG (Max 5MB)
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingLogo ? "Uploading..." : logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>

                  {logoUrl && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleLogoDelete}
                      disabled={uploadingLogo}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              The logo will appear on report cards, class lists, and other official documents.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>
    </div>
  );
}
