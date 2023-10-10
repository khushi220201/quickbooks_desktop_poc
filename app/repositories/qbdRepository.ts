import { prisma } from "../client/prisma";

class QbdRepository {
  async checkUserCredential(id:any, username:any, password:any) {
    try {
      // Use Prisma to find the user by id
      const user = await prisma.connections.findUnique({
        where: {
          id: id,
        },
      });
  
      // Check if a user with the given id exists
      if (!user) {
        throw new Error("User Not Found");
      }
  
      // Parse the tokenDetails JSON string into an object
      const tokenDetails = JSON.parse(user.tokenDetails);
  
      // Check if the username and password match the tokenDetails
      if (tokenDetails.username === username && tokenDetails.password === password) {
        // Return the username and password as a JSON object
        return {
          username: tokenDetails.username,
          password: tokenDetails.password,
        };
      } else {
        // throw new Error("Invalid Credentials");
        return null;
      }
    } catch (error) {
      // Handle any errors that occur during the database operation
      console.error("Error:", error.message);
      throw error; // Re-throw the error for the calling code to handle
    }
  }

  async updateActiveConnection(id:any) {
    try {
      await prisma.connections.update({
        where: {
          id: id,
        },
        data: {
          isActiveConnection: true,
        },
      });
    } catch (error) {
      // Handle any errors that occur during the database operation
      console.error("Error updating isActiveConnection:", error.message);
      throw error; // Re-throw the error for the calling code to handle
    }
  }
  
}

export default new QbdRepository();
