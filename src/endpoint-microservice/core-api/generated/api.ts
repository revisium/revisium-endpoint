/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface LoginDto {
  emailOrUsername: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface CreateUserDto {
  email?: string;
  username?: string;
  roleId: 'systemAdmin' | 'systemFullApiRead' | 'systemUser';
  password: string;
}

export interface ProjectModel {
  id: string;
  organizationId: string;
  /** @format date-time */
  createdAt: string;
  name: string;
}

export interface ProjectModelEdgeType {
  cursor: string;
  node: ProjectModel;
}

export interface PageInfo {
  endCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
}

export interface ProjectsConnection {
  edges: ProjectModelEdgeType[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface CreateProjectDto {
  projectName: string;
  /** @default "master" */
  branchName?: string;
}

export interface UserModel {
  id: string;
  username?: string;
}

export interface RoleModel {
  id: string;
  name: string;
}

export interface UsersOrganizationModel {
  id: string;
  user: UserModel;
  role: RoleModel;
}

export interface UsersOrganizationModelEdgeType {
  cursor: string;
  node: UsersOrganizationModel;
}

export interface UsersOrganizationConnection {
  edges: UsersOrganizationModelEdgeType[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface AddUserToOrganizationDto {
  userId: string;
  roleId: 'organizationOwner' | 'organizationAdmin' | 'developer' | 'editor' | 'reader';
}

export interface RemoveUserFromOrganizationDto {
  userId: string;
}

export interface BranchModel {
  id: string;
  projectId: string;
  /** @format date-time */
  createdAt: string;
  isRoot: boolean;
  name: string;
}

export interface BranchModelEdgeType {
  cursor: string;
  node: BranchModel;
}

export interface BranchesConnection {
  edges: BranchModelEdgeType[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface UsersProjectModel {
  id: string;
  user: UserModel;
  role: RoleModel;
}

export interface UsersProjectModelEdgeType {
  cursor: string;
  node: UsersProjectModel;
}

export interface UsersProjectConnection {
  edges: UsersProjectModelEdgeType[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface AddUserToProjectDto {
  userId: string;
  roleId: 'developer' | 'editor' | 'reader';
}

export interface Id {
  id: string;
}

export interface ParentBranchResponse {
  branch: Id;
  revision: Id;
}

export interface RevisionModel {
  id: string;
  /** @format date-time */
  createdAt: string;
  isDraft: boolean;
  isHead: boolean;
}

export interface RevisionModelEdgeType {
  cursor: string;
  node: RevisionModel;
}

export interface RevisionsConnection {
  edges: RevisionModelEdgeType[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface CreateRevisionDto {
  /** @default "" */
  comment?: string;
}

export interface ChildBranchResponse {
  branch: Id;
  revision: Id;
}

export interface TableModel {
  versionId: string;
  id: string;
  /** @format date-time */
  createdAt: string;
  readonly: boolean;
}

export interface TableModelEdgeType {
  cursor: string;
  node: TableModel;
}

export interface TablesConnection {
  edges: TableModelEdgeType[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface EndpointModel {
  id: string;
  /** @format date-time */
  createdAt: string;
  type: 'GRAPHQL' | 'REST_API';
}

export interface CreateBranchByRevisionDto {
  branchName: string;
}

export interface CreateEndpointDto {
  type: 'GRAPHQL' | 'REST_API';
}

export interface CreateTableDto {
  tableId: string;
  schema: object;
}

export interface CreateTableResponse {
  branch: BranchModel;
  table: TableModel;
}

export interface RowModel {
  versionId: string;
  id: string;
  /** @format date-time */
  createdAt: string;
  readonly: boolean;
  data: object;
}

export interface RowModelEdgeType {
  cursor: string;
  node: RowModel;
}

export interface RowsConnection {
  edges: RowModelEdgeType[];
  totalCount: number;
  pageInfo: PageInfo;
}

export interface CreateRowDto {
  rowId: string;
  data: object;
}

export interface CreateRowResponse {
  table: TableModel;
  previousVersionTableId: string;
  row: RowModel;
}

export interface UpdateTableDto {
  patches: object[];
}

export interface UpdateTableResponse {
  table?: TableModel;
  previousVersionTableId: string;
}

export interface RemoveRowResponse {
  branch: BranchModel;
  table?: TableModel;
  previousVersionTableId?: string;
}

export interface UpdateRowDto {
  data: object;
}

export interface UpdateRowResponse {
  table?: TableModel;
  previousVersionTableId?: string;
  row?: RowModel;
  previousVersionRowId?: string;
}

export interface ProjectsParams {
  /** @default 100 */
  first: number;
  after?: string;
  organizationId: string;
}

export interface CreateProjectParams {
  fromRevisionId: string;
  organizationId: string;
}

export interface UsersOrganizationParams {
  /** @default 100 */
  first: number;
  after?: string;
  organizationId: string;
}

export interface BranchesParams {
  /** @default 100 */
  first: number;
  after?: string;
  organizationId: string;
  projectName: string;
}

export interface UsersProjectParams {
  /** @default 100 */
  first: number;
  after?: string;
  organizationId: string;
  projectName: string;
}

export interface RevisionsParams {
  /** @default 100 */
  first: number;
  after?: string;
  before?: string;
  organizationId: string;
  projectName: string;
  branchName: string;
}

export interface TablesParams {
  /** @default 100 */
  first: number;
  after?: string;
  revisionId: string;
}

export interface RowsParams {
  /** @default 100 */
  first: number;
  after?: string;
  revisionId: string;
  tableId: string;
}

export interface TableReferencesByParams {
  /** @default 100 */
  first: number;
  after?: string;
  revisionId: string;
  tableId: string;
}

export interface TableReferencesToParams {
  /** @default 100 */
  first: number;
  after?: string;
  revisionId: string;
  tableId: string;
}

export interface RowReferencesByParams {
  referenceByTableId: string;
  /** @default 100 */
  first: number;
  after?: string;
  revisionId: string;
  tableId: string;
  rowId: string;
}

export interface RowReferencesToParams {
  referenceToTableId: string;
  /** @default 100 */
  first: number;
  after?: string;
  revisionId: string;
  tableId: string;
  rowId: string;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, 'body' | 'bodyUsed'>;

export interface FullRequestParams extends Omit<RequestInit, 'body'> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, 'baseUrl' | 'cancelToken' | 'signal'>;
  securityWorker?: (securityData: SecurityDataType | null) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown> extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = 'application/json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain',
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = '';
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker'];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) => fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: 'same-origin',
    headers: {},
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${encodeURIComponent(typeof value === 'number' ? value : `${value}`)}`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join('&');
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter((key) => 'undefined' !== typeof query[key]);
    return keys
      .map((key) => (Array.isArray(query[key]) ? this.addArrayQueryParam(query, key) : this.addQueryParam(query, key)))
      .join('&');
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : '';
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === 'object' || typeof input === 'string') ? JSON.stringify(input) : input,
    [ContentType.Text]: (input: any) => (input !== null && typeof input !== 'string' ? JSON.stringify(input) : input),
    [ContentType.FormData]: (input: any) =>
      Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === 'object' && property !== null
              ? JSON.stringify(property)
              : `${property}`,
        );
        return formData;
      }, new FormData()),
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(params1: RequestParams, params2?: RequestParams): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (cancelToken: CancelToken): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(`${baseUrl || this.baseUrl || ''}${path}${queryString ? `?${queryString}` : ''}`, {
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type && type !== ContentType.FormData ? { 'Content-Type': type } : {}),
      },
      signal: (cancelToken ? this.createAbortSignal(cancelToken) : requestParams.signal) || null,
      body: typeof body === 'undefined' || body === null ? null : payloadFormatter(body),
    }).then(async (response) => {
      const r = response.clone() as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const data = !responseFormat
        ? r
        : await response[responseFormat]()
            .then((data) => {
              if (r.ok) {
                r.data = data;
              } else {
                r.error = data;
              }
              return r;
            })
            .catch((e) => {
              r.error = e;
              return r;
            });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data.data;
    });
  };
}

/**
 * @title Revisium API
 * @version 0.8.2
 * @contact
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  /**
   * No description
   *
   * @tags Auth
   * @name Login
   * @request POST:/-/api/auth/login
   * @secure
   */
  login = (data: LoginDto, params: RequestParams = {}) =>
    this.request<LoginResponse, any>({
      path: `/-/api/auth/login`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Auth
   * @name CreateUser
   * @request POST:/-/api/auth/user
   * @secure
   */
  createUser = (data: CreateUserDto, params: RequestParams = {}) =>
    this.request<boolean, any>({
      path: `/-/api/auth/user`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Organization
   * @name Projects
   * @request GET:/-/api/organization/{organizationId}/projects
   * @secure
   */
  projects = ({ organizationId, ...query }: ProjectsParams, params: RequestParams = {}) =>
    this.request<ProjectsConnection, any>({
      path: `/-/api/organization/${organizationId}/projects`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Organization
   * @name CreateProject
   * @request POST:/-/api/organization/{organizationId}/projects
   * @secure
   */
  createProject = (
    { organizationId, ...query }: CreateProjectParams,
    data: CreateProjectDto,
    params: RequestParams = {},
  ) =>
    this.request<ProjectModel, any>({
      path: `/-/api/organization/${organizationId}/projects`,
      method: 'POST',
      query: query,
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Organization
   * @name UsersOrganization
   * @request GET:/-/api/organization/{organizationId}/users
   * @secure
   */
  usersOrganization = ({ organizationId, ...query }: UsersOrganizationParams, params: RequestParams = {}) =>
    this.request<UsersOrganizationConnection, any>({
      path: `/-/api/organization/${organizationId}/users`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Organization
   * @name AddUserToOrganization
   * @request POST:/-/api/organization/{organizationId}/users
   * @secure
   */
  addUserToOrganization = (organizationId: string, data: AddUserToOrganizationDto, params: RequestParams = {}) =>
    this.request<boolean, any>({
      path: `/-/api/organization/${organizationId}/users`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Organization
   * @name RemoveUserFromOrganization
   * @request DELETE:/-/api/organization/{organizationId}/users
   * @secure
   */
  removeUserFromOrganization = (
    organizationId: string,
    data: RemoveUserFromOrganizationDto,
    params: RequestParams = {},
  ) =>
    this.request<boolean, any>({
      path: `/-/api/organization/${organizationId}/users`,
      method: 'DELETE',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Project
   * @name Project
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}
   * @secure
   */
  project = (organizationId: string, projectName: string, params: RequestParams = {}) =>
    this.request<ProjectModel, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Project
   * @name DeleteProject
   * @request DELETE:/-/api/organization/{organizationId}/projects/{projectName}
   * @secure
   */
  deleteProject = (organizationId: string, projectName: string, params: RequestParams = {}) =>
    this.request<boolean, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Project
   * @name RootBranch
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/root-branch
   * @secure
   */
  rootBranch = (organizationId: string, projectName: string, params: RequestParams = {}) =>
    this.request<BranchModel, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/root-branch`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Project
   * @name Branches
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/branches
   * @secure
   */
  branches = ({ organizationId, projectName, ...query }: BranchesParams, params: RequestParams = {}) =>
    this.request<BranchesConnection, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Project
   * @name UsersProject
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/users
   * @secure
   */
  usersProject = ({ organizationId, projectName, ...query }: UsersProjectParams, params: RequestParams = {}) =>
    this.request<UsersProjectConnection, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/users`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Project
   * @name AddUserToProject
   * @request POST:/-/api/organization/{organizationId}/projects/{projectName}/users
   * @secure
   */
  addUserToProject = (
    organizationId: string,
    projectName: string,
    data: AddUserToProjectDto,
    params: RequestParams = {},
  ) =>
    this.request<boolean, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/users`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Project
   * @name RemoveUserFromProject
   * @request DELETE:/-/api/organization/{organizationId}/projects/{projectName}/users/{userId}
   * @secure
   */
  removeUserFromProject = (organizationId: string, projectName: string, userId: string, params: RequestParams = {}) =>
    this.request<boolean, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/users/${userId}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name Branch
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}
   * @secure
   */
  branch = (organizationId: string, projectName: string, branchName: string, params: RequestParams = {}) =>
    this.request<BranchModel, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name BranchTouched
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}/touched
   * @secure
   */
  branchTouched = (organizationId: string, projectName: string, branchName: string, params: RequestParams = {}) =>
    this.request<boolean, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/touched`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name ParentBranch
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}/parent-branch
   * @secure
   */
  parentBranch = (organizationId: string, projectName: string, branchName: string, params: RequestParams = {}) =>
    this.request<ParentBranchResponse, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/parent-branch`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name StartRevision
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}/start-revision
   * @secure
   */
  startRevision = (organizationId: string, projectName: string, branchName: string, params: RequestParams = {}) =>
    this.request<RevisionModel, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/start-revision`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name HeadRevision
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}/head-revision
   * @secure
   */
  headRevision = (organizationId: string, projectName: string, branchName: string, params: RequestParams = {}) =>
    this.request<RevisionModel, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/head-revision`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name DraftRevision
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}/draft-revision
   * @secure
   */
  draftRevision = (organizationId: string, projectName: string, branchName: string, params: RequestParams = {}) =>
    this.request<RevisionModel, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/draft-revision`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name Revisions
   * @request GET:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}/revisions
   * @secure
   */
  revisions = ({ organizationId, projectName, branchName, ...query }: RevisionsParams, params: RequestParams = {}) =>
    this.request<RevisionsConnection, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/revisions`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name CreateRevision
   * @request POST:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}/create-revision
   * @secure
   */
  createRevision = (
    organizationId: string,
    projectName: string,
    branchName: string,
    data: CreateRevisionDto,
    params: RequestParams = {},
  ) =>
    this.request<RevisionModel, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/create-revision`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Branch
   * @name RevertChanges
   * @request POST:/-/api/organization/{organizationId}/projects/{projectName}/branches/{branchName}/revert-changes
   * @secure
   */
  revertChanges = (organizationId: string, projectName: string, branchName: string, params: RequestParams = {}) =>
    this.request<BranchModel, any>({
      path: `/-/api/organization/${organizationId}/projects/${projectName}/branches/${branchName}/revert-changes`,
      method: 'POST',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name Revision
   * @request GET:/-/api/revision/{revisionId}
   * @secure
   */
  revision = (revisionId: string, params: RequestParams = {}) =>
    this.request<RevisionModel, any>({
      path: `/-/api/revision/${revisionId}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name ParentRevision
   * @request GET:/-/api/revision/{revisionId}/parent-revision
   * @secure
   */
  parentRevision = (revisionId: string, params: RequestParams = {}) =>
    this.request<RevisionModel, any>({
      path: `/-/api/revision/${revisionId}/parent-revision`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name ChildRevision
   * @request GET:/-/api/revision/{revisionId}/child-revision
   * @secure
   */
  childRevision = (revisionId: string, params: RequestParams = {}) =>
    this.request<RevisionModel, any>({
      path: `/-/api/revision/${revisionId}/child-revision`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name ChildBranches
   * @request GET:/-/api/revision/{revisionId}/child-branches
   * @secure
   */
  childBranches = (revisionId: string, params: RequestParams = {}) =>
    this.request<ChildBranchResponse[], any>({
      path: `/-/api/revision/${revisionId}/child-branches`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name CreateBranch
   * @request POST:/-/api/revision/{revisionId}/child-branches
   * @secure
   */
  createBranch = (revisionId: string, data: CreateBranchByRevisionDto, params: RequestParams = {}) =>
    this.request<BranchModel, any>({
      path: `/-/api/revision/${revisionId}/child-branches`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name Tables
   * @request GET:/-/api/revision/{revisionId}/tables
   * @secure
   */
  tables = ({ revisionId, ...query }: TablesParams, params: RequestParams = {}) =>
    this.request<TablesConnection, any>({
      path: `/-/api/revision/${revisionId}/tables`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name CreateTable
   * @request POST:/-/api/revision/{revisionId}/tables
   * @secure
   */
  createTable = (revisionId: string, data: CreateTableDto, params: RequestParams = {}) =>
    this.request<CreateTableResponse, any>({
      path: `/-/api/revision/${revisionId}/tables`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name Endpoints
   * @request GET:/-/api/revision/{revisionId}/endpoints
   * @secure
   */
  endpoints = (revisionId: string, params: RequestParams = {}) =>
    this.request<EndpointModel[], any>({
      path: `/-/api/revision/${revisionId}/endpoints`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Revision
   * @name CreateEndpoint
   * @request POST:/-/api/revision/{revisionId}/endpoints
   * @secure
   */
  createEndpoint = (revisionId: string, data: CreateEndpointDto, params: RequestParams = {}) =>
    this.request<EndpointModel, any>({
      path: `/-/api/revision/${revisionId}/endpoints`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name Table
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}
   * @secure
   */
  table = (revisionId: string, tableId: string, params: RequestParams = {}) =>
    this.request<TableModel, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name DeleteTable
   * @request DELETE:/-/api/revision/{revisionId}/tables/{tableId}
   * @secure
   */
  deleteTable = (revisionId: string, tableId: string, params: RequestParams = {}) =>
    this.request<BranchModel, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name UpdateTable
   * @request PATCH:/-/api/revision/{revisionId}/tables/{tableId}
   * @secure
   */
  updateTable = (revisionId: string, tableId: string, data: UpdateTableDto, params: RequestParams = {}) =>
    this.request<UpdateTableResponse, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}`,
      method: 'PATCH',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name TableCountRows
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/count-rows
   * @secure
   */
  tableCountRows = (revisionId: string, tableId: string, params: RequestParams = {}) =>
    this.request<number, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/count-rows`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name Rows
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/rows
   * @secure
   */
  rows = ({ revisionId, tableId, ...query }: RowsParams, params: RequestParams = {}) =>
    this.request<RowsConnection, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name CreateRow
   * @request POST:/-/api/revision/{revisionId}/tables/{tableId}/rows
   * @secure
   */
  createRow = (revisionId: string, tableId: string, data: CreateRowDto, params: RequestParams = {}) =>
    this.request<CreateRowResponse, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows`,
      method: 'POST',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name TableSchema
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/schema
   * @secure
   */
  tableSchema = (revisionId: string, tableId: string, params: RequestParams = {}) =>
    this.request<object, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/schema`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name TableCountReferencesBy
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/count-references-by
   * @secure
   */
  tableCountReferencesBy = (revisionId: string, tableId: string, params: RequestParams = {}) =>
    this.request<number, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/count-references-by`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name TableReferencesBy
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/references-by
   * @secure
   */
  tableReferencesBy = ({ revisionId, tableId, ...query }: TableReferencesByParams, params: RequestParams = {}) =>
    this.request<TablesConnection, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/references-by`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name TableCountReferencesTo
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/count-references-to
   * @secure
   */
  tableCountReferencesTo = (revisionId: string, tableId: string, params: RequestParams = {}) =>
    this.request<number, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/count-references-to`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Table
   * @name TableReferencesTo
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/references-to
   * @secure
   */
  tableReferencesTo = ({ revisionId, tableId, ...query }: TableReferencesToParams, params: RequestParams = {}) =>
    this.request<TablesConnection, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/references-to`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Row
   * @name Row
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/rows/{rowId}
   * @secure
   */
  row = (revisionId: string, tableId: string, rowId: string, params: RequestParams = {}) =>
    this.request<RowModel, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Row
   * @name DeleteRow
   * @request DELETE:/-/api/revision/{revisionId}/tables/{tableId}/rows/{rowId}
   * @secure
   */
  deleteRow = (revisionId: string, tableId: string, rowId: string, params: RequestParams = {}) =>
    this.request<RemoveRowResponse, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Row
   * @name UpdateRow
   * @request PUT:/-/api/revision/{revisionId}/tables/{tableId}/rows/{rowId}
   * @secure
   */
  updateRow = (revisionId: string, tableId: string, rowId: string, data: UpdateRowDto, params: RequestParams = {}) =>
    this.request<UpdateRowResponse, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}`,
      method: 'PUT',
      body: data,
      secure: true,
      type: ContentType.Json,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Row
   * @name RowCountReferencesBy
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/rows/{rowId}/count-references-by
   * @secure
   */
  rowCountReferencesBy = (revisionId: string, tableId: string, rowId: string, params: RequestParams = {}) =>
    this.request<number, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}/count-references-by`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Row
   * @name RowReferencesBy
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/rows/{rowId}/references-by
   * @secure
   */
  rowReferencesBy = ({ revisionId, tableId, rowId, ...query }: RowReferencesByParams, params: RequestParams = {}) =>
    this.request<RowsConnection, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}/references-by`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Row
   * @name RowCountReferencesTo
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/rows/{rowId}/count-references-to
   * @secure
   */
  rowCountReferencesTo = (revisionId: string, tableId: string, rowId: string, params: RequestParams = {}) =>
    this.request<number, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}/count-references-to`,
      method: 'GET',
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Row
   * @name RowReferencesTo
   * @request GET:/-/api/revision/{revisionId}/tables/{tableId}/rows/{rowId}/references-to
   * @secure
   */
  rowReferencesTo = ({ revisionId, tableId, rowId, ...query }: RowReferencesToParams, params: RequestParams = {}) =>
    this.request<RowsConnection, any>({
      path: `/-/api/revision/${revisionId}/tables/${tableId}/rows/${rowId}/references-to`,
      method: 'GET',
      query: query,
      secure: true,
      format: 'json',
      ...params,
    });

  /**
   * No description
   *
   * @tags Endpoint
   * @name DeleteEndpoint
   * @request DELETE:/-/api/endpoints/{endpointId}
   * @secure
   */
  deleteEndpoint = (endpointId: string, params: RequestParams = {}) =>
    this.request<boolean, any>({
      path: `/-/api/endpoints/${endpointId}`,
      method: 'DELETE',
      secure: true,
      format: 'json',
      ...params,
    });

  health = {
    /**
     * No description
     *
     * @tags health
     * @name HealthControllerGet
     * @request GET:/health
     */
    healthControllerGet: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/health`,
        method: 'GET',
        ...params,
      }),
  };
}