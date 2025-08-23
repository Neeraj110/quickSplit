import {
  CreateGroupRequest,
  PopulatedGroup,
  ExpenseFormData,
} from "@/types/type";

export async function CreateExpense(
  expenseData: ExpenseFormData
): Promise<Response> {
  try {
    const formData = new FormData();

    formData.append("groupId", expenseData.groupId);
    formData.append("amount", expenseData.amount.toString());
    formData.append("description", expenseData.description);
    formData.append("category", expenseData.category);
    formData.append("currency", expenseData.currency);
    formData.append("splitType", expenseData.splitType);
    formData.append("payerId", expenseData.payerId);

    if (expenseData.splits && expenseData.splits.length > 0) {
      formData.append("splits", JSON.stringify(expenseData.splits));
    }

    if (expenseData.receipt && expenseData.receipt instanceof File) {
      formData.append("receipt", expenseData.receipt);
    }

    const response = await fetch("/api/expenses", {
      method: "POST",
      body: formData,
    });

    return response;
  } catch (error) {
    console.error("Error in CreateExpense:", error);
    throw error;
  }
}

export async function fetchExpenses(): Promise<ExpenseFormData[]> {
  try {
    const response = await fetch("/api/expenses");
    if (!response.ok) {
      throw new Error("Failed to fetch expenses");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }
}

export async function updateExpense(
  expenseId: string,
  expenseData: Partial<ExpenseFormData>
): Promise<Response> {
  try {
    const response = await fetch(`/api/expenses/${expenseId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expenseData),
    });

    if (!response.ok) {
      throw new Error("Failed to update expense");
    }

    return response;
  } catch (error) {
    console.error("Error updating expense:", error);
    throw error;
  }
}

export async function deleteExpense(expenseId: string): Promise<Response> {
  try {
    const response = await fetch(`/api/expenses/${expenseId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete expense");
    }

    return response;
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
}

export async function fetchExpenseDetails(
  expenseId: string
): Promise<ExpenseFormData | null> {
  try {
    const response = await fetch(`/api/expenses/${expenseId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch expense details");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching expense details:", error);
    return null;
  }
}

export async function createGroup(
  groupData: CreateGroupRequest
): Promise<Response> {
  try {
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      throw new Error("Failed to create group");
    }

    return response;
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
}

export async function fetchGroupDetails(
  groupId: string
): Promise<PopulatedGroup | null> {
  try {
    const response = await fetch(`/api/groups/${groupId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch group details");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching group details:", error);
    return null;
  }
}

export async function updateGroup(
  groupId: string,
  groupData: Partial<CreateGroupRequest>
): Promise<Response> {
  try {
    const response = await fetch(`/api/groups/${groupId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(groupData),
    });

    if (!response.ok) {
      throw new Error("Failed to update group");
    }

    return response;
  } catch (error) {
    console.error("Error updating group:", error);
    throw error;
  }
}

export async function deleteGroup(groupId: string): Promise<Response> {
  try {
    const response = await fetch(`/api/groups/${groupId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete group");
    }

    return response;
  } catch (error) {
    console.error("Error deleting group:", error);
    throw error;
  }
}

export async function fetchGroups(): Promise<PopulatedGroup[]> {
  try {
    const response = await fetch("/api/groups");
    if (!response.ok) {
      throw new Error("Failed to fetch groups");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching groups:", error);
    return [];
  }
}

export async function fetchUserProfile() {
  try {
    const response = await fetch("/api/user");
    if (!response.ok) {
      throw new Error("Failed to fetch user profile");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}
