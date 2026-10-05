import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
} from "@mui/material";


const drawerWidth = 240;


export default function Sidebar() {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,

        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Toolbar />

      <List>
        <ListItemButton>
          <ListItemText primary="Inicio" />
        </ListItemButton>

        <ListItemButton>
          <ListItemText primary="Mis trabajos" />
        </ListItemButton>

        <ListItemButton>
          <ListItemText primary="Perfil" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}