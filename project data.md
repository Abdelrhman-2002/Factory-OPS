this is a file that will give you all the project flows and contexts.


first this project is for managing multible factories (multi-tanent)and help them take decitions based on the analysis that will be provided on the website. The project will be as following there will be a couple of rules such as the adminstrator, Organizatoin admin and the user. The user will be have a role that will be provided by the organization admin so that the organinzation admin will set a role and then chose the permesions from the permestonis categories, The permesions are all the BREAD operations for each catigory such as Employees, Inventory, etc... 

the admin can create and manage organizatios and can have a full access through the dashboard.
the organization admin can:
    -set a role and assign it to an employee and edit it and delete it
    -can do all the bread operations on the user
    -can do all the operation  for the items and inventory
    -see all the warnings about expiry
    -see all see all the problem tickets and the reports
the user can do all what the organization admin assign for such as:
    -make a ticket for a machine problem and downtime


where are now just focusing on invoking the data and launcing the MVP later will use MCP to provide suggestions based on the data imported from excel and the one on the website also.

The planned project schema was something as following
admin{
    id,name,email,pass
}
organization{
    id,name,descreption
}
employee{
    organizationId, name,email,phone numbe, etc..
}
role{
    permessions[],
}
permessions{
    name, descreption, access
}
item{
    id,squ(barcode),name, descreptoin
}
stock{
    itemId,quantity
}
stockPatch{
    id,quantity,expiryDate,etc...
}
machine{
    id,name,descreption,lastMaintinance,etc..
}
ticket{
    id,title,problem[employee,machine,other],descreption0
}
order{

}
poduction{
    item,quantity,descreption
}
auditLog{
    id,authorId,changeDescreption
}
Profits{

}


technologies will be used{
    nest JS for the backend
    Postgressql with prisma and docker for the database
    front end will be with react nextJS
    will use arcjet for the backend and use the shield and limitrate from it
    betterAuth for authintecation
}