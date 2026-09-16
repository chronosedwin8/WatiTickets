// Database types for Supabase
// Auto-generated types will be enhanced here

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// Enums
export type TicketStatus = 'new' | 'open' | 'pending' | 'on_hold' | 'resolved' | 'closed'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type TicketType = 'incident' | 'service_request' | 'problem' | 'change' | 'bug' | 'feature'
export type TicketSource = 'portal' | 'email' | 'chat' | 'whatsapp' | 'teams' | 'api' | 'iot'
export type UserRole = 'admin' | 'owner' | 'manager' | 'agent' | 'technician' | 'developer' | 'customer'
export type AssetStatus = 'in_stock' | 'in_use' | 'maintenance' | 'retired' | 'disposed'
export type WorkOrderStatus = 'new' | 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled'
export type SprintStatus = 'planned' | 'active' | 'completed'
export type UserStoryStatus = 'backlog' | 'ready' | 'in_progress' | 'review' | 'done'
export type ChangeRequestStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'implemented' | 'cancelled'
export type ProblemStatus = 'new' | 'analyzing' | 'root_cause_identified' | 'fix_in_progress' | 'resolved' | 'closed'
export type ChangeType = 'standard' | 'normal' | 'emergency'
export type ServiceItemType = 'hardware' | 'software' | 'access' | 'service'
export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical'

export interface Database {
    public: {
        Tables: {
            tenants: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    domain: string | null
                    logo_url: string | null
                    primary_color: string
                    settings: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    domain?: string | null
                    logo_url?: string | null
                    primary_color?: string
                    settings?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    domain?: string | null
                    logo_url?: string | null
                    primary_color?: string
                    settings?: Json
                    updated_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    tenant_id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    role: UserRole
                    department: string | null
                    skills: string[] | null
                    is_active: boolean
                    metadata: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    tenant_id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: UserRole
                    department?: string | null
                    skills?: string[] | null
                    is_active?: boolean
                    metadata?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    tenant_id?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    role?: UserRole
                    department?: string | null
                    skills?: string[] | null
                    is_active?: boolean
                    metadata?: Json
                    updated_at?: string
                }
            }
            categories: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    description: string | null
                    type: 'support' | 'development' | 'infrastructure' | 'general' | 'problem' | 'change' | 'service' | 'incident'
                    parent_id: string | null
                    sla_policy_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    name: string
                    description?: string | null
                    type: 'support' | 'development' | 'infrastructure' | 'general' | 'problem' | 'change' | 'service' | 'incident'
                    parent_id?: string | null
                    sla_policy_id?: string | null
                    created_at?: string
                }
                Update: {
                    name?: string
                    description?: string | null
                    type?: 'support' | 'development' | 'infrastructure' | 'general' | 'problem' | 'change' | 'service' | 'incident'
                    parent_id?: string | null
                    sla_policy_id?: string | null
                }
            }
            sla_policies: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    description: string | null
                    response_time_hours: number
                    resolution_time_hours: number
                    priority: TicketPriority
                    business_hours_only: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    name: string
                    description?: string | null
                    response_time_hours: number
                    resolution_time_hours: number
                    priority: TicketPriority
                    business_hours_only?: boolean
                    created_at?: string
                }
                Update: {
                    name?: string
                    description?: string | null
                    response_time_hours?: number
                    resolution_time_hours?: number
                    priority?: TicketPriority
                    business_hours_only?: boolean
                }
            }
            priority_sla_config: {
                Row: {
                    id: string
                    tenant_id: string
                    priority: TicketPriority
                    response_time_hours: number
                    resolution_time_hours: number
                    business_hours_only: boolean
                    escalation_enabled: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    priority: TicketPriority
                    response_time_hours: number
                    resolution_time_hours: number
                    business_hours_only?: boolean
                    escalation_enabled?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    priority?: TicketPriority
                    response_time_hours?: number
                    resolution_time_hours?: number
                    business_hours_only?: boolean
                    escalation_enabled?: boolean
                    updated_at?: string
                }
            }
            tickets: {
                Row: {
                    id: string
                    tenant_id: string
                    number: number
                    title: string
                    description: string | null
                    status: TicketStatus
                    priority: TicketPriority
                    type: TicketType
                    category_id: string | null
                    requester_id: string | null
                    assignee_id: string | null
                    team_id: string | null
                    source: TicketSource
                    sla_policy_id: string | null
                    sla_due_at: string | null
                    first_response_at: string | null
                    resolved_at: string | null
                    closed_at: string | null
                    satisfaction_rating: number | null
                    tags: string[] | null
                    custom_fields: Json
                    attachments: Json
                    linked_asset_id: string | null
                    asset_id: string | null
                    linked_user_story_id: string | null
                    merged_to_ticket_id: string | null
                    impact_level: ImpactLevel
                    planned_start_at: string | null
                    planned_end_at: string | null
                    planned_effort_minutes: number | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    number?: number
                    title: string
                    description?: string | null
                    status?: TicketStatus
                    priority?: TicketPriority
                    type?: TicketType
                    category_id?: string | null
                    requester_id?: string | null
                    assignee_id?: string | null
                    team_id?: string | null
                    source?: TicketSource
                    sla_policy_id?: string | null
                    sla_due_at?: string | null
                    first_response_at?: string | null
                    resolved_at?: string | null
                    closed_at?: string | null
                    satisfaction_rating?: number | null
                    tags?: string[] | null
                    custom_fields?: Json
                    attachments?: Json
                    linked_asset_id?: string | null
                    linked_user_story_id?: string | null
                    merged_to_ticket_id?: string | null
                    impact_level?: ImpactLevel
                    planned_start_at?: string | null
                    planned_end_at?: string | null
                    planned_effort_minutes?: number | null
                    asset_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    title?: string
                    description?: string | null
                    status?: TicketStatus
                    priority?: TicketPriority
                    type?: TicketType
                    category_id?: string | null
                    assignee_id?: string | null
                    team_id?: string | null
                    source?: TicketSource
                    sla_policy_id?: string | null
                    sla_due_at?: string | null
                    first_response_at?: string | null
                    resolved_at?: string | null
                    closed_at?: string | null
                    satisfaction_rating?: number | null
                    tags?: string[] | null
                    custom_fields?: Json
                    linked_asset_id?: string | null
                    linked_user_story_id?: string | null
                    merged_to_ticket_id?: string | null
                    impact_level?: ImpactLevel
                    planned_start_at?: string | null
                    planned_end_at?: string | null
                    planned_effort_minutes?: number | null
                    asset_id?: string | null
                    updated_at?: string
                }
            }
            ticket_comments: {
                Row: {
                    id: string
                    ticket_id: string
                    author_id: string | null
                    content: string
                    is_public: boolean
                    is_resolution: boolean
                    attachments: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    ticket_id: string
                    author_id?: string | null
                    content: string
                    is_public?: boolean
                    is_resolution?: boolean
                    attachments?: Json
                    created_at?: string
                }
                Update: {
                    content?: string
                    is_public?: boolean
                    is_resolution?: boolean
                    attachments?: Json
                }
            }
            problems: {
                Row: {
                    id: string
                    tenant_id: string
                    number: number
                    title: string
                    description: string | null
                    status: ProblemStatus
                    priority: TicketPriority
                    root_cause: string | null
                    workaround: string | null
                    category_id: string | null
                    assignee_id: string | null
                    department_id: string | null
                    source_ticket_id: string | null
                    project_id: string | null
                    attachments: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    number?: number
                    title: string
                    description?: string | null
                    status?: ProblemStatus
                    priority?: TicketPriority
                    root_cause?: string | null
                    workaround?: string | null
                    category_id?: string | null
                    assignee_id?: string | null
                    department_id?: string | null
                    source_ticket_id?: string | null
                    project_id?: string | null
                    attachments?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    title?: string
                    description?: string | null
                    status?: ProblemStatus
                    priority?: TicketPriority
                    root_cause?: string | null
                    workaround?: string | null
                    category_id?: string | null
                    assignee_id?: string | null
                    department_id?: string | null
                    source_ticket_id?: string | null
                    project_id?: string | null
                    attachments?: Json | null
                    updated_at?: string
                }
            }
            changes: {
                Row: {
                    id: string
                    tenant_id: string
                    number: number
                    title: string
                    description: string | null
                    status: ChangeRequestStatus
                    priority: TicketPriority
                    type: ChangeType
                    reason: string | null
                    impact_analysis: string | null
                    risk_analysis: string | null
                    rollback_plan: string | null
                    requester_id: string | null
                    assignee_id: string | null
                    department_id: string | null
                    scheduled_start: string | null
                    scheduled_end: string | null
                    actual_start: string | null
                    actual_end: string | null
                    project_id: string | null
                    attachments: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    number?: number
                    title: string
                    description?: string | null
                    status?: ChangeRequestStatus
                    priority?: TicketPriority
                    type?: ChangeType
                    reason?: string | null
                    impact_analysis?: string | null
                    risk_analysis?: string | null
                    rollback_plan?: string | null
                    requester_id?: string | null
                    assignee_id?: string | null
                    department_id?: string | null
                    scheduled_start?: string | null
                    scheduled_end?: string | null
                    actual_start?: string | null
                    actual_end?: string | null
                    project_id?: string | null
                    attachments?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    title?: string
                    description?: string | null
                    status?: ChangeRequestStatus
                    priority?: TicketPriority
                    type?: ChangeType
                    reason?: string | null
                    impact_analysis?: string | null
                    risk_analysis?: string | null
                    rollback_plan?: string | null
                    requester_id?: string | null
                    assignee_id?: string | null
                    department_id?: string | null
                    scheduled_start?: string | null
                    scheduled_end?: string | null
                    actual_start?: string | null
                    actual_end?: string | null
                    project_id?: string | null
                    attachments?: Json | null
                    updated_at?: string
                }
            }
            service_catalog_items: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    description: string | null
                    type: ServiceItemType
                    category_id: string | null
                    sla_policy_id: string | null
                    price: number | null
                    currency: string
                    approval_required: boolean
                    icon_url: string | null
                    is_active: boolean
                    form_schema: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    name: string
                    description?: string | null
                    type?: ServiceItemType
                    category_id?: string | null
                    sla_policy_id?: string | null
                    price?: number | null
                    currency?: string
                    approval_required?: boolean
                    icon_url?: string | null
                    is_active?: boolean
                    form_schema?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    name?: string
                    description?: string | null
                    type?: ServiceItemType
                    category_id?: string | null
                    sla_policy_id?: string | null
                    price?: number | null
                    currency?: string
                    approval_required?: boolean
                    icon_url?: string | null
                    is_active?: boolean
                    form_schema?: Json | null
                    updated_at?: string
                }
            }
            kb_articles: {
                Row: {
                    id: string
                    tenant_id: string
                    title: string
                    content: string
                    category_id: string | null
                    status: 'draft' | 'published' | 'archived'
                    author_id: string | null
                    view_count: number
                    helpful_count: number
                    created_at: string
                    updated_at: string
                    department_id: string | null
                    content_type: string | null
                    media_url: string | null
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    title: string
                    content: string
                    category_id?: string | null
                    status?: 'draft' | 'published' | 'archived'
                    author_id?: string | null
                    view_count?: number
                    helpful_count?: number
                    created_at?: string
                    updated_at?: string
                    department_id?: string | null
                    content_type?: string | null
                    media_url?: string | null
                }
                Update: {
                    title?: string
                    content?: string
                    category_id?: string | null
                    status?: 'draft' | 'published' | 'archived'
                    view_count?: number
                    helpful_count?: number
                    updated_at?: string
                    department_id?: string | null
                    content_type?: string | null
                    media_url?: string | null
                }
            }
            asset_groups: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    created_at?: string
                    updated_at?: string
                }
            },
            assets: {
                Row: {
                    id: string
                    tenant_id: string
                    asset_type_id: string | null
                    asset_tag: string | null
                    name: string
                    description: string | null
                    status: AssetStatus
                    serial_number: string | null
                    manufacturer: string | null
                    model: string | null
                    location_id: string | null
                    assigned_user_id: string | null
                    department: string | null
                    purchase_date: string | null
                    purchase_cost: number | null
                    warranty_expiry: string | null
                    custom_fields: Json
                    created_at: string
                    updated_at: string
                    building: string | null
                    floor: string | null
                    office: string | null
                    acquisition_date: string | null
                    has_insurance: boolean
                    insurance_expiry: string | null
                    insurer_name: string | null
                    vendor_name: string | null
                    custom_fields_schema: Json
                    hardware_info: Json
                    asset_group_id: string | null
                    department_id: string | null
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    asset_type_id?: string | null
                    asset_tag?: string | null
                    name: string
                    description?: string | null
                    status?: AssetStatus
                    serial_number?: string | null
                    manufacturer?: string | null
                    model?: string | null
                    location_id?: string | null
                    assigned_user_id?: string | null
                    department?: string | null
                    purchase_date?: string | null
                    purchase_cost?: number | null
                    warranty_expiry?: string | null
                    custom_fields?: Json
                    created_at?: string
                    updated_at?: string
                    building?: string | null
                    floor?: string | null
                    office?: string | null
                    acquisition_date?: string | null
                    has_insurance?: boolean
                    insurance_expiry?: string | null
                    insurer_name?: string | null
                    vendor_name?: string | null
                    custom_fields_schema?: Json
                    hardware_info?: Json
                    asset_group_id?: string | null
                    department_id?: string | null
                }
                Update: {
                    asset_type_id?: string | null
                    asset_tag?: string | null
                    name?: string
                    description?: string | null
                    status?: AssetStatus
                    serial_number?: string | null
                    manufacturer?: string | null
                    model?: string | null
                    location_id?: string | null
                    assigned_user_id?: string | null
                    department?: string | null
                    purchase_date?: string | null
                    purchase_cost?: number | null
                    warranty_expiry?: string | null
                    custom_fields?: Json
                    updated_at?: string
                    building?: string | null
                    floor?: string | null
                    office?: string | null
                    acquisition_date?: string | null
                    has_insurance?: boolean
                    insurance_expiry?: string | null
                    insurer_name?: string | null
                    vendor_name?: string | null
                    custom_fields_schema?: Json
                    hardware_info?: Json
                    asset_group_id?: string | null
                    department_id?: string | null
                }
            }
            asset_history: {
                Row: {
                    id: string
                    asset_id: string
                    changed_by: string | null
                    change_type: string
                    old_values: Json | null
                    new_values: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    asset_id: string
                    changed_by?: string | null
                    change_type: string
                    old_values?: Json | null
                    new_values?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    asset_id?: string
                    changed_by?: string | null
                    change_type?: string
                    old_values?: Json | null
                    new_values?: Json | null
                    created_at?: string
                }
            }
            work_orders: {
                Row: {
                    id: string
                    tenant_id: string
                    number: number
                    title: string
                    description: string | null
                    status: WorkOrderStatus
                    priority: TicketPriority
                    type: 'repair' | 'installation' | 'maintenance' | 'inspection'
                    location_id: string | null
                    asset_id: string | null
                    source_ticket_id: string | null
                    scheduled_start: string | null
                    scheduled_end: string | null
                    actual_start: string | null
                    actual_end: string | null
                    technician_id: string | null
                    department_id: string | null
                    customer_signature: string | null
                    photos: Json
                    completion_notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    number?: number
                    title: string
                    description?: string | null
                    status?: WorkOrderStatus
                    priority?: TicketPriority
                    type: 'repair' | 'installation' | 'maintenance' | 'inspection'
                    location_id?: string | null
                    asset_id?: string | null
                    source_ticket_id?: string | null
                    scheduled_start?: string | null
                    scheduled_end?: string | null
                    actual_start?: string | null
                    actual_end?: string | null
                    technician_id?: string | null
                    department_id?: string | null
                    customer_signature?: string | null
                    photos?: Json
                    completion_notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    title?: string
                    description?: string | null
                    status?: WorkOrderStatus
                    priority?: TicketPriority
                    type?: 'repair' | 'installation' | 'maintenance' | 'inspection'
                    location_id?: string | null
                    asset_id?: string | null
                    scheduled_start?: string | null
                    scheduled_end?: string | null
                    actual_start?: string | null
                    actual_end?: string | null
                    technician_id?: string | null
                    department_id?: string | null
                    customer_signature?: string | null
                    photos?: Json
                    completion_notes?: string | null
                    updated_at?: string
                }
            }
            projects: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    key: string
                    description: string | null
                    repository_url: string | null
                    status: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    name: string
                    key: string
                    description?: string | null
                    repository_url?: string | null
                    status?: string
                    created_at?: string
                }
                Update: {
                    name?: string
                    key?: string
                    description?: string | null
                    repository_url?: string | null
                    status?: string
                }
            }
            sprints: {
                Row: {
                    id: string
                    project_id: string
                    name: string
                    goal: string | null
                    start_date: string | null
                    end_date: string | null
                    status: SprintStatus
                    velocity: number | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    name: string
                    goal?: string | null
                    start_date?: string | null
                    end_date?: string | null
                    status?: SprintStatus
                    velocity?: number | null
                    created_at?: string
                }
                Update: {
                    name?: string
                    goal?: string | null
                    start_date?: string | null
                    end_date?: string | null
                    status?: SprintStatus
                    velocity?: number | null
                }
            }
            user_stories: {
                Row: {
                    id: string
                    project_id: string
                    sprint_id: string | null
                    number: number
                    title: string
                    description: string | null
                    acceptance_criteria: string | null
                    status: UserStoryStatus
                    type: 'story' | 'bug' | 'task' | 'subtask' | 'epic'
                    priority: TicketPriority
                    story_points: number | null
                    assignee_id: string | null
                    parent_id: string | null
                    source_ticket_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    project_id: string
                    sprint_id?: string | null
                    number?: number
                    title: string
                    description?: string | null
                    acceptance_criteria?: string | null
                    status?: UserStoryStatus
                    type?: 'story' | 'bug' | 'task' | 'subtask' | 'epic'
                    priority?: TicketPriority
                    story_points?: number | null
                    assignee_id?: string | null
                    parent_id?: string | null
                    source_ticket_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    sprint_id?: string | null
                    title?: string
                    description?: string | null
                    acceptance_criteria?: string | null
                    status?: UserStoryStatus
                    type?: 'story' | 'bug' | 'task' | 'subtask' | 'epic'
                    priority?: TicketPriority
                    story_points?: number | null
                    assignee_id?: string | null
                    parent_id?: string | null
                    source_ticket_id?: string | null
                    updated_at?: string
                }
            }
            time_entries: {
                Row: {
                    id: string
                    tenant_id: string
                    user_id: string
                    ticket_id: string | null
                    work_order_id: string | null
                    user_story_id: string | null
                    duration_minutes: number
                    description: string | null
                    billable: boolean
                    hourly_rate: number | null
                    date: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    user_id: string
                    ticket_id?: string | null
                    work_order_id?: string | null
                    user_story_id?: string | null
                    duration_minutes: number
                    description?: string | null
                    billable?: boolean
                    hourly_rate?: number | null
                    date: string
                    created_at?: string
                }
                Update: {
                    ticket_id?: string | null
                    work_order_id?: string | null
                    user_story_id?: string | null
                    duration_minutes?: number
                    description?: string | null
                    billable?: boolean
                    hourly_rate?: number | null
                    date?: string
                }
            }
            audit_logs: {
                Row: {
                    id: string
                    tenant_id: string
                    user_id: string | null
                    action: string
                    resource_type: string
                    resource_id: string | null
                    old_values: Json | null
                    new_values: Json | null
                    ip_address: string | null
                    user_agent: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    user_id?: string | null
                    action: string
                    resource_type: string
                    resource_id?: string | null
                    old_values?: Json | null
                    new_values?: Json | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Update: never
            }
            absence_reasons: {
                Row: {
                    id: string
                    tenant_id: string
                    name: string
                    description: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    name: string
                    description?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    name?: string
                    description?: string | null
                    is_active?: boolean
                    updated_at?: string
                }
            }
            absences: {
                Row: {
                    id: string
                    tenant_id: string
                    requester_id: string
                    reason_id: string
                    start_date: string
                    start_time: string
                    end_date: string
                    end_time: string
                    description: string | null
                    evidence_url: string | null
                    medical_certificate_url: string | null
                    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    tenant_id: string
                    requester_id: string
                    reason_id: string
                    start_date: string
                    start_time: string
                    end_date: string
                    end_time: string
                    description?: string | null
                    evidence_url?: string | null
                    medical_certificate_url?: string | null
                    status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    reason_id?: string
                    start_date?: string
                    start_time?: string
                    end_date?: string
                    end_time?: string
                    description?: string | null
                    evidence_url?: string | null
                    medical_certificate_url?: string | null
                    status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
                    updated_at?: string
                }
            }
            absence_approvals: {
                Row: {
                    id: string
                    absence_id: string
                    approver_id: string
                    status: 'approved' | 'rejected'
                    comments: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    absence_id: string
                    approver_id: string
                    status: 'approved' | 'rejected'
                    comments?: string | null
                    created_at?: string
                }
                Update: never
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            ticket_status: TicketStatus
            ticket_priority: TicketPriority
            ticket_type: TicketType
            ticket_source: TicketSource
            user_role: UserRole
            asset_status: AssetStatus
            work_order_status: WorkOrderStatus
        }
    }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type Tenant = Tables<'tenants'>
export type Profile = Tables<'profiles'>
export type Ticket = Tables<'tickets'>
export type TicketComment = Tables<'ticket_comments'>
export type Category = Tables<'categories'>
export type SlaPolicy = Tables<'sla_policies'>
export type KbArticle = Tables<'kb_articles'>
export type Asset = Tables<'assets'>
export type WorkOrder = Tables<'work_orders'>
export type Project = Tables<'projects'>
export type Sprint = Tables<'sprints'>
export type UserStory = Tables<'user_stories'>
export type TimeEntry = Tables<'time_entries'>
export type AuditLog = Tables<'audit_logs'>
export type Problem = Tables<'problems'>
export type Change = Tables<'changes'>
export type ServiceItem = Tables<'service_catalog_items'>
export type PrioritySLAConfig = Tables<'priority_sla_config'>
export type AbsenceReason = Tables<'absence_reasons'>
export type Absence = Tables<'absences'>
export type AbsenceApproval = Tables<'absence_approvals'>

export type AbsenceWithRelations = Absence & {
    reason?: AbsenceReason | null
    requester?: Profile | null
    approvals?: (AbsenceApproval & {
        approver?: Profile | null
    })[]
}

export interface ProblemWithRelations extends Problem {
    assignee?: {
        full_name: string | null
        avatar_url: string | null
    } | null
    category?: {
        name: string
    } | null
    department?: {
        name: string
    } | null
}

export interface ChangeWithRelations extends Change {
    requester?: {
        full_name: string | null
        avatar_url: string | null
    } | null
    assignee?: {
        full_name: string | null
        avatar_url: string | null
    } | null
    department?: {
        name: string
    } | null
}


// Extended types with joins
export type TicketWithRelations = Ticket & {
    category?: Category | null
    requester?: Profile | null
    assignee?: Profile | null
    assignees?: { user: Profile }[]
    team?: { name: string } | null
    asset?: { id: string; name: string; asset_tag: string | null } | null
    sla_policy?: SlaPolicy | null
    comments?: TicketComment[]
}

export type WorkOrderWithRelations = WorkOrder & {
    technician?: Profile | null
    asset?: Asset | null
    source_ticket?: Ticket | null
    location?: { name: string } | null
    department?: { name: string } | null
}

export type UserStoryWithRelations = UserStory & {
    sprint?: Sprint | null
    assignee?: Profile | null
    source_ticket?: Ticket | null
}
