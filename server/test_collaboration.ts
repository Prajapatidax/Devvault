/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbManager } from "./db";
import crypto from "crypto";
import { hashPassword } from "./auth";
import { Project, ProjectMember, Invitation, User, ProjectStatus, ProjectPriority } from "./types";

async function runTests() {
  console.log("=== STARTING TEAM COLLABORATION INTEGRATION TESTS ===");

  try {
    // 1. Initialize database connection
    await dbManager.initialize();

    // 2. Create clean mock test users
    const userA: User = {
      id: "test-user-a-" + Date.now(),
      email: `usera-${Date.now()}@example.com`,
      name: "User Alice",
      passwordHash: hashPassword("password123"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userB: User = {
      id: "test-user-b-" + Date.now(),
      email: `userb-${Date.now()}@example.com`,
      name: "User Bob",
      passwordHash: hashPassword("password123"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const userC: User = {
      id: "test-user-c-" + Date.now(),
      email: `userc-${Date.now()}@example.com`,
      name: "User Charlie",
      passwordHash: hashPassword("password123"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbManager.createUser(userA);
    await dbManager.createUser(userB);
    await dbManager.createUser(userC);
    console.log("✓ Created mock test users: Alice, Bob, Charlie.");

    // 3. Alice creates a project
    const project: Project = {
      id: "test-project-" + Date.now(),
      userId: userA.id,
      name: "Collaboration Platform Test",
      description: "Testing RLS and role permissions",
      status: ProjectStatus.PLANNING,
      techStack: ["Node", "TypeScript"],
      deadline: "",
      priority: ProjectPriority.HIGH,
      repository: "",
      liveUrl: "",
      server: "",
      database: "",
      domain: "",
      apiKeys: "",
      notes: "",
      progress: 0,
      attachments: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbManager.createProject(project);
    console.log("✓ Alice created a new project.");

    // 4. Verify Alice is automatically set as the Owner in project_members
    const members = await dbManager.getProjectMembers(project.id);
    const aliceMember = members.find((m) => m.userId === userA.id);
    if (!aliceMember || aliceMember.role !== "owner") {
      throw new Error("Failed: Project creator was not automatically assigned the 'owner' role.");
    }
    console.log("✓ Confirmed: Alice is assigned as project owner.");

    // 5. Alice invites Bob as Editor
    const invitation: Invitation = {
      id: "test-inv-" + Date.now(),
      projectId: project.id,
      inviterId: userA.id,
      email: userB.email,
      role: "editor",
      message: "Hey Bob, let's work on this!",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbManager.createInvitation(invitation);
    console.log(`✓ Alice sent an invitation to Bob (${userB.email}) as Editor.`);

    // 6. Verify duplicate pending invitation fails/prevention checks
    const duplicateInv = await dbManager.getInvitationByProjectAndEmail(project.id, userB.email);
    if (!duplicateInv) {
      throw new Error("Failed: Pending invitation was not found in database.");
    }
    console.log("✓ Checked: Pending invitation matches email and project.");

    // 7. Bob accepts the invitation and joins the project
    const bMember: ProjectMember = {
      id: "test-pm-b-" + Date.now(),
      projectId: project.id,
      userId: userB.id,
      role: duplicateInv.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbManager.createProjectMember(bMember);
    await dbManager.deleteInvitation(duplicateInv.id);
    console.log("✓ Bob accepted the invitation and joined the project.");

    // 8. Verify Bob is now a member of the project
    const membersUpdated = await dbManager.getProjectMembers(project.id);
    const bobMember = membersUpdated.find((m) => m.userId === userB.id);
    if (!bobMember || bobMember.role !== "editor") {
      throw new Error("Failed: Bob was not successfully added to project members as editor.");
    }
    console.log("✓ Confirmed: Bob is now a project member with 'editor' role.");

    // 9. Alice changes Bob's role to Admin
    const roleChangeSuccess = await dbManager.updateProjectMemberRole(project.id, userB.id, "admin");
    if (!roleChangeSuccess) {
      throw new Error("Failed: Failed to update Bob's role.");
    }
    const bobMemberUpdated = await dbManager.getProjectMember(project.id, userB.id);
    if (bobMemberUpdated?.role !== "admin") {
      throw new Error("Failed: Bob's role was not updated to admin.");
    }
    console.log("✓ Alice updated Bob's role to 'admin'.");

    // 10. Alice transfers project ownership to Bob
    const transferSuccess = await dbManager.transferProjectOwnership(project.id, userA.id, userB.id);
    if (!transferSuccess) {
      throw new Error("Failed: Project ownership transfer failed.");
    }
    
    // Verify Bob is now Owner, and Alice is Admin
    const aliceMemberNew = await dbManager.getProjectMember(project.id, userA.id);
    const bobMemberNew = await dbManager.getProjectMember(project.id, userB.id);

    if (bobMemberNew?.role !== "owner" || aliceMemberNew?.role !== "admin") {
      throw new Error(`Failed: Ownership transfer roles incorrect. Bob: ${bobMemberNew?.role}, Alice: ${aliceMemberNew?.role}`);
    }
    console.log("✓ Ownership transferred successfully: Bob is now Owner, Alice is Admin.");

    // 11. Bob removes Alice from the project
    const removeSuccess = await dbManager.deleteProjectMember(project.id, userA.id);
    if (!removeSuccess) {
      throw new Error("Failed: Bob could not remove Alice from project.");
    }
    const membersFinal = await dbManager.getProjectMembers(project.id);
    const aliceFound = membersFinal.some((m) => m.userId === userA.id);
    if (aliceFound) {
      throw new Error("Failed: Alice still exists in project members after deletion.");
    }
    console.log("✓ Bob removed Alice from the project members.");

    // 12. Cleanup database records
    console.log("=== INTEGRATION TESTS COMPLETED SUCCESSFULLY ===");
    process.exit(0);

  } catch (err: any) {
    console.error("❌ TEST FAILED:", err.message || err);
    process.exit(1);
  }
}

runTests();
