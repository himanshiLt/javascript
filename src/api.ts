import { OrgIdToOrgMemberInfo, UserRole } from "./org"

export type User = {
    userId: string
    email: string
    username?: string
}

export type AuthenticationInfo = {
    accessToken: string
    expiresAtSeconds: number
    orgIdToOrgMemberInfo?: OrgIdToOrgMemberInfo
    user: User
}

export type LogoutResponse = {
    redirect_to: string
}

export function fetchAuthenticationInfo(authUrl: string): Promise<AuthenticationInfo | null> {
    return new Promise((resolve, reject) => {
        const http = new XMLHttpRequest()

        http.onreadystatechange = function () {
            if (http.readyState === XMLHttpRequest.DONE) {
                const status = http.status

                if (status >= 200 && status < 300) {
                    try {
                        const refreshTokenAndUserInfo = parseJsonConvertingSnakeToCamel(http.responseText)
                        resolve(refreshTokenAndUserInfo)
                    } catch (e) {
                        console.error("Unable to process authentication response", e)
                        reject({
                            status: 500,
                            message: "Unable to process authentication response",
                        })
                    }
                } else if (status === 401) {
                    resolve(null)
                } else {
                    reject({
                        status,
                        message: http.responseText,
                    })
                }
            }
        }

        http.open("get", `${authUrl}/api/v1/refresh_token`)
        http.withCredentials = true
        http.ontimeout = function () {
            reject({
                status: 408,
                message: "Request timed out",
            })
        }
        http.send(null)
    })
}

export function logout(authUrl: string): Promise<LogoutResponse> {
    return new Promise((resolve, reject) => {
        const http = new XMLHttpRequest()

        http.onreadystatechange = function () {
            if (http.readyState === XMLHttpRequest.DONE) {
                const status = http.status
                if (status >= 200 && status < 300) {
                    const jsonResponse = JSON.parse(http.responseText)
                    resolve(jsonResponse)
                } else {
                    console.error("Logout error", http.status, http.responseText)
                    reject({
                        status,
                        message: http.responseText,
                    })
                }
            }
        }

        http.open("post", `${authUrl}/api/v1/logout`)
        http.withCredentials = true
        http.ontimeout = function () {
            reject({
                status: 408,
                message: "Request timed out",
            })
        }
        http.send(null)
    })
}

// The API responds with snake_case, but TypeScript convention is camelCase.
// When parsing JSON, we pass in reviver function to convert from snake_case to camelCase.
export function parseJsonConvertingSnakeToCamel(str: string): AuthenticationInfo {
    return JSON.parse(str, function (key, value) {
        if (key === "org_id") {
            this.orgId = value
        } else if (key === "org_name") {
            this.orgName = value
        } else if (key === "user_role") {
            this.userRole = toUserRole(value)
        } else if (key === "access_token") {
            this.accessToken = value
        } else if (key === "expires_at_seconds") {
            this.expiresAtSeconds = value
        } else if (key === "org_id_to_org_member_info") {
            this.orgIdToOrgMemberInfo = value
        } else if (key === "user_id") {
            this.userId = value
        } else {
            return value
        }
    })
}

function toUserRole(userRole: string): UserRole {
    return UserRole[userRole as keyof typeof UserRole]
}