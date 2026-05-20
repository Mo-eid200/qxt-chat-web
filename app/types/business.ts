export type BusinessMembership = {
    workspace_id: string;

    workspace_name: string;

    workspace_slug?: string | null;

    role: string;

    plan?: string | null;

    balance?: number;

    seats?: number;
};

export type CurrentBusiness = {
    workspace_id: string;

    workspace_name: string;
};

export type BusinessMeResponse = {
    memberships: BusinessMembership[];

    current_business:
    | CurrentBusiness
    | null;
};